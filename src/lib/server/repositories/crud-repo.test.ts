import { beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// P0-1 — a camada de gravação não pode mais reescrever a tabela inteira
// ═══════════════════════════════════════════════════════════════════════════
// O padrão anterior (`save(listaInteira)` → replaceById) apagava toda linha
// ausente da lista enviada. Estes testes travam as duas garantias que
// substituíram aquele desenho:
//
//  1. cada operação toca UMA linha, por id — nunca um delete em massa;
//  2. lista truncada pelo teto de linhas do PostgREST vira erro visível em vez
//     de silenciosamente virar base para cálculo e gravação.

type Call = { op: string; table: string; payload?: unknown; filter?: [string, unknown] };
let calls: Call[] = [];
let rowsByTable: Record<string, unknown[]> = {};
let countByTable: Record<string, number | null> = {};

type QueryResult = { data: unknown[]; error: null; count: number };
interface MockBuilder extends PromiseLike<QueryResult> {
  select: () => MockBuilder;
  insert: (payload: unknown) => MockBuilder;
  update: (payload: unknown) => MockBuilder;
  upsert: (payload: unknown) => MockBuilder;
  delete: () => MockBuilder;
  eq: (column: string, value: unknown) => MockBuilder;
  in: (column: string, values: unknown[]) => MockBuilder;
  order: () => MockBuilder;
}

function builderFor(table: string) {
  const state: { op: string; payload?: unknown } = { op: "select" };
  const builder: MockBuilder = {
    select: () => builder,
    insert: (payload: unknown) => {
      state.op = "insert";
      state.payload = payload;
      calls.push({ op: "insert", table, payload });
      return builder;
    },
    update: (payload: unknown) => {
      state.op = "update";
      state.payload = payload;
      return builder;
    },
    upsert: (payload: unknown) => {
      calls.push({ op: "upsert", table, payload });
      return builder;
    },
    delete: () => {
      state.op = "delete";
      return builder;
    },
    eq: (column: string, value: unknown) => {
      calls.push({ op: state.op, table, payload: state.payload, filter: [column, value] });
      return builder;
    },
    in: (column: string, values: unknown[]) => {
      calls.push({ op: state.op, table, payload: state.payload, filter: [column, values] });
      return builder;
    },
    order: () => builder,
    then: (resolve, reject) =>
      Promise.resolve({
        data: rowsByTable[table] ?? [],
        error: null,
        count: countByTable[table] ?? (rowsByTable[table] ?? []).length,
      }).then(resolve, reject),
  };
  return builder;
}

vi.mock("../supabase.server", () => ({
  getSupabaseAdminClient: () => ({ from: (table: string) => builderFor(table) }),
}));

type Linha = { id: string; nome: string };
const config = {
  table: "teste",
  fromRow: (row: Linha): Linha => ({ id: row.id, nome: row.nome }),
  toRow: (row: Linha) => ({ id: row.id, nome: row.nome }),
  order: [{ column: "id", ascending: true }],
};

beforeEach(() => {
  calls = [];
  rowsByTable = {
    teste: [
      { id: "a", nome: "A" },
      { id: "b", nome: "B" },
    ],
  };
  countByTable = {};
});

describe("createCrudRepo", () => {
  it("insert grava uma linha, sem apagar nada", async () => {
    const { createCrudRepo } = await import("./crud-repo");
    const repo = await createCrudRepo(config)();

    await repo.insert({ id: "c", nome: "C" });

    const escritas = calls.filter((c) => c.op !== "select");
    expect(escritas).toEqual([{ op: "insert", table: "teste", payload: { id: "c", nome: "C" } }]);
    expect(escritas.some((c) => c.op === "delete")).toBe(false);
  });

  it("update filtra por id e nao toca nas outras linhas", async () => {
    const { createCrudRepo } = await import("./crud-repo");
    const repo = await createCrudRepo(config)();

    await repo.update({ id: "a", nome: "A2" });

    const escritas = calls.filter((c) => c.op !== "select");
    expect(escritas).toHaveLength(1);
    expect(escritas[0]!.op).toBe("update");
    expect(escritas[0]!.filter).toEqual(["id", "a"]);
  });

  it("remove apaga exatamente um id", async () => {
    const { createCrudRepo } = await import("./crud-repo");
    const repo = await createCrudRepo(config)();

    await repo.remove("b");

    const deletes = calls.filter((c) => c.op === "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.filter).toEqual(["id", "b"]);
  });

  it("removeMany([]) nao dispara delete algum", async () => {
    const { createCrudRepo } = await import("./crud-repo");
    const repo = await createCrudRepo(config)();

    await repo.removeMany([]);

    expect(calls.filter((c) => c.op === "delete")).toHaveLength(0);
  });

  it("updateMany atualiza cada linha por id, uma gravacao por vez", async () => {
    const { createCrudRepo } = await import("./crud-repo");
    const repo = await createCrudRepo(config)();

    await repo.updateMany([
      { id: "a", nome: "A2" },
      { id: "b", nome: "B2" },
    ]);

    const updates = calls.filter((c) => c.op === "update");
    expect(updates.map((c) => c.filter)).toEqual([
      ["id", "a"],
      ["id", "b"],
    ]);
  });

  it("recusa lista truncada pelo teto de linhas do PostgREST", async () => {
    // O banco tem 1500 linhas mas a API devolveu 1000: prosseguir com essa
    // lista foi exatamente o que tornava o replaceById destrutivo.
    rowsByTable.teste = Array.from({ length: 1000 }, (_, i) => ({ id: `x${i}`, nome: "X" }));
    countByTable.teste = 1500;

    const { createCrudRepo } = await import("./crud-repo");

    await expect(createCrudRepo(config)()).rejects.toThrow(/1500 linhas.*1000/s);
  });

  it("aceita a lista quando a contagem bate", async () => {
    countByTable.teste = 2;
    const { createCrudRepo } = await import("./crud-repo");

    const repo = await createCrudRepo(config)();
    expect(repo.list).toHaveLength(2);
  });
});
