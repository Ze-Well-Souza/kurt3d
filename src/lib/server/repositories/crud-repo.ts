import { getSupabaseAdminClient } from "../supabase.server";
import { RepositoryError, unwrapResult } from "./shared";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Repositório CRUD genérico (P0-1)
 * ─────────────────────────────────────────────────────────────────────────────
 * Substitui o padrão anterior de `save(listaInteira)`, que reescrevia a tabela
 * a cada gravação e apagava toda linha ausente da lista enviada. Aquele
 * desenho tinha dois modos de falha:
 *
 *  (a) Concorrência — o sistema é operado por dois admins. Se um cria um
 *      pedido enquanto o outro salva uma despesa, a lista em memória do
 *      segundo é anterior ao pedido do primeiro, e o save dele DELETAVA o
 *      pedido recém-criado, em silêncio.
 *
 *  (b) Teto de linhas do PostgREST — o `select("id")` e o `select("*")
 *      .order(...)` devolvem subconjuntos diferentes quando a tabela passa do
 *      limite, então a diferença entre eles virava DELETE de linhas vivas.
 *
 * Aqui cada operação toca só a linha que precisa: insert, update por id,
 * delete por id. Duas gravações concorrentes em linhas diferentes não se
 * atropelam mais.
 */

type RowWithId = { id: string };

export type CrudRepo<T extends RowWithId> = {
  /** Snapshot lido no momento em que o repositório foi construído. */
  list: T[];
  insert(row: T): Promise<T>;
  update(row: T): Promise<T>;
  upsert(row: T): Promise<T>;
  insertMany(rows: T[]): Promise<void>;
  /** Atualiza várias linhas por id. Cada uma é uma gravação independente. */
  updateMany(rows: T[]): Promise<void>;
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
};

type OrderSpec = { column: string; ascending?: boolean };

export type CrudRepoConfig<T extends RowWithId, R> = {
  table: string;
  /** Uma linha lida do banco tem todas as colunas — sempre o tipo completo. */
  fromRow: (row: R) => T;
  /**
   * Um payload de escrita pode legitimamente omitir colunas: as que têm
   * default no banco (ex.: `created_at`) ou as que a aplicação decidiu não
   * gerenciar mais (ex.: `portfolio_projects.consumo_kw`, mantida na tabela
   * mas sem campo de domínio correspondente desde a limpeza do P2-7).
   */
  toRow: (row: T) => Partial<R>;
  /** Ordenação aplicada no SQL. Vários níveis são aplicados na ordem dada. */
  order?: OrderSpec[];
};

export function createCrudRepo<T extends RowWithId, R>(config: CrudRepoConfig<T, R>) {
  const { table, fromRow, toRow, order = [] } = config;

  return async function repo(): Promise<CrudRepo<T>> {
    const supabase = getSupabaseAdminClient();

    // `count: "exact"` é o que transforma truncamento silencioso em erro
    // visível: o PostgREST limita a resposta a `db-max-rows`, mas devolve a
    // contagem real no cabeçalho. Se as duas divergirem, a lista em memória
    // está incompleta e qualquer decisão tomada em cima dela seria errada.
    let query = supabase.from(table).select("*", { count: "exact" });
    for (const spec of order) {
      query = query.order(spec.column, { ascending: spec.ascending ?? true });
    }

    const result = await query;
    const rows = unwrapResult(result, {
      table,
      operation: "list",
      query: `select(*).order(${order.map((o) => `${o.column} ${o.ascending === false ? "desc" : "asc"}`).join(", ")})`,
    }) as R[];

    const total = result.count ?? rows.length;
    if (rows.length < total) {
      throw new RepositoryError({
        table,
        operation: "list",
        query: "select(*) truncado pelo teto de linhas do PostgREST",
        metadata: { recebidas: rows.length, totalNoBanco: total },
        error: {
          message:
            `A tabela "${table}" tem ${total} linhas mas a API devolveu apenas ${rows.length}. ` +
            `Aumente db-max-rows nas configuracoes da API do Supabase ou pagine esta consulta. ` +
            `Prosseguir com a lista truncada produziria calculos e gravacoes incorretos.`,
          details: `recebidas=${rows.length} total=${total}`,
          hint: "Supabase Dashboard > Settings > API > Max rows",
          code: "TRUNCATED",
          name: "RepositoryTruncationError",
          toJSON() {
            return { ...this };
          },
        },
      });
    }

    const list = rows.map(fromRow);

    return {
      list,

      async insert(row: T) {
        unwrapResult(await supabase.from(table).insert(toRow(row) as never), {
          table,
          operation: "insert",
          query: "insert(row)",
          metadata: { id: row.id },
        });
        return row;
      },

      async update(row: T) {
        unwrapResult(
          await supabase
            .from(table)
            .update(toRow(row) as never)
            .eq("id", row.id),
          {
            table,
            operation: "update",
            query: "update().eq(id)",
            metadata: { id: row.id },
          },
        );
        return row;
      },

      async upsert(row: T) {
        unwrapResult(await supabase.from(table).upsert(toRow(row) as never, { onConflict: "id" }), {
          table,
          operation: "upsert",
          query: "upsert(onConflict=id)",
          metadata: { id: row.id },
        });
        return row;
      },

      async insertMany(rows: T[]) {
        if (rows.length === 0) return;
        unwrapResult(await supabase.from(table).insert(rows.map(toRow) as never[]), {
          table,
          operation: "insertMany",
          query: "insert(rows)",
          metadata: { count: rows.length },
        });
      },

      async updateMany(rows: T[]) {
        for (const row of rows) {
          unwrapResult(
            await supabase
              .from(table)
              .update(toRow(row) as never)
              .eq("id", row.id),
            {
              table,
              operation: "updateMany",
              query: "update().eq(id)",
              metadata: { id: row.id, count: rows.length },
            },
          );
        }
      },

      async remove(id: string) {
        unwrapResult(await supabase.from(table).delete().eq("id", id), {
          table,
          operation: "remove",
          query: "delete().eq(id)",
          metadata: { id },
        });
      },

      async removeMany(ids: string[]) {
        if (ids.length === 0) return;
        unwrapResult(await supabase.from(table).delete().in("id", ids), {
          table,
          operation: "removeMany",
          query: "delete().in(id)",
          metadata: { count: ids.length },
        });
      },
    };
  };
}
