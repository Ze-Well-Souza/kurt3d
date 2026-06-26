import { nowIso } from "../db.server";
import { getSupabaseAdminClient } from "../supabase.server";
import { filamentosRepo } from "./filamentos.repo";
import { fromFilamentoHistoryRow, toFilamentoHistoryRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function filamentosHistoryRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("filamentos_history").select("*").order("arquivado_at", { ascending: false }), {
    table: "filamentos_history",
    operation: "list",
    query: "select(*).order(arquivado_at desc)",
  });
  const list = (rows as any[]).map(fromFilamentoHistoryRow);
  return {
    list,
    async save(next: ReturnType<typeof fromFilamentoHistoryRow>[]) {
      await replaceById("filamentos_history", next.map(toFilamentoHistoryRow));
    },
    async archive(filamento: Awaited<ReturnType<typeof filamentosRepo>>["list"][number]) {
      const historyRow = {
        ...filamento,
        arquivadoAt: nowIso(),
      };
      unwrapResult(await supabase.from("filamentos_history").insert(toFilamentoHistoryRow(historyRow)), {
        table: "filamentos_history",
        operation: "archiveInsert",
        query: "insert(historyRow)",
        metadata: { filamentoId: filamento.id },
      });
      const activeRepo = await filamentosRepo();
      await activeRepo.save(activeRepo.list.filter((item) => item.id !== filamento.id));
      return historyRow;
    },
  };
}
