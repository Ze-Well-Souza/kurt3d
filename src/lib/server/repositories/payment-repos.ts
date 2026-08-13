import { getSupabaseAdminClient } from "../supabase.server";
import { createCrudRepo, type CrudRepoConfig } from "./crud-repo";
import { unwrapResult } from "./shared";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Fábricas de repositório de pagamento parcelado (P2-1)
 * ─────────────────────────────────────────────────────────────────────────────
 * Filamento e insumo têm o mesmo modelo de pagamento — plano, parcelas e
 * eventos — e os seis repositórios eram cópias byte a byte a menos do nome da
 * tabela. Essa duplicação é a razão de o P0-2 (valor negativo na quitação
 * parcial) existir em dobro: a correção precisava ser aplicada duas vezes, e o
 * modo de falha padrão é consertar uma e esquecer a outra.
 *
 * Aqui cada modelo é declarado uma vez e parametrizado pela tabela.
 */

/** Plano de pagamento: CRUD + vínculo com o item comprado (lote ou insumo). */
export function createPaymentsRepo<T extends { id: string }, R>(config: {
  repo: CrudRepoConfig<T, R>;
  /** Tabela do item que carrega a coluna `payment_id` (filamentos ou insumos). */
  ownerTable: string;
  /** Coluna usada para localizar o item ao vincular o plano. */
  ownerMatchColumn: string;
  /** Colunas gravadas no item no momento do vínculo. */
  buildAttachPatch: (ownerMatchValue: string, paymentId: string) => Record<string, unknown>;
}) {
  const base = createCrudRepo(config.repo);

  return async function paymentsRepo() {
    const repo = await base();
    const supabase = getSupabaseAdminClient();

    return {
      ...repo,

      /** Vincula o plano recém-criado ao item comprado. */
      async attach(ownerMatchValue: string, paymentId: string) {
        unwrapResult(
          await supabase
            .from(config.ownerTable)
            .update(config.buildAttachPatch(ownerMatchValue, paymentId))
            .eq(config.ownerMatchColumn, ownerMatchValue),
          {
            table: config.ownerTable,
            operation: "attachPayment",
            query: `update(payment_id).eq(${config.ownerMatchColumn})`,
            metadata: { ownerMatchValue, paymentId },
          },
        );
      },

      /** Desvincula o plano de todos os itens que apontavam para ele. */
      async detach(paymentId: string) {
        unwrapResult(
          await supabase
            .from(config.ownerTable)
            .update({ payment_id: null })
            .eq("payment_id", paymentId),
          {
            table: config.ownerTable,
            operation: "detachPayment",
            query: "update(payment_id=null).eq(payment_id)",
            metadata: { paymentId },
          },
        );
      },
    };
  };
}

/** Parcelas de um plano: CRUD + exclusão em bloco por plano. */
export function createInstallmentsRepo<T extends { id: string }, R>(
  repoConfig: CrudRepoConfig<T, R>,
) {
  const base = createCrudRepo(repoConfig);

  return async function installmentsRepo() {
    const repo = await base();
    const supabase = getSupabaseAdminClient();

    return {
      ...repo,

      async deleteByPayment(paymentId: string) {
        unwrapResult(await supabase.from(repoConfig.table).delete().eq("payment_id", paymentId), {
          table: repoConfig.table,
          operation: "deleteByPayment",
          query: "delete().eq(payment_id)",
          metadata: { paymentId },
        });
      },
    };
  };
}
