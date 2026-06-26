import { getSupabaseAdminClient } from "../supabase.server";
import { fromFilamentoRow, toFilamentoRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function filamentosRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("filamentos").select("*").order("created_at", { ascending: false }), {
    table: "filamentos",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromFilamentoRow);
  return {
    list,
    async save(next: ReturnType<typeof fromFilamentoRow>[]) {
      await replaceById("filamentos", next.map(toFilamentoRow));
    },
  };
}
