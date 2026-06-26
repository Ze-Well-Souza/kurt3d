import { getSupabaseAdminClient } from "../supabase.server";
import { fromInsumoRow, toInsumoRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function insumosRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("insumos").select("*").order("data_compra", { ascending: false }), {
    table: "insumos",
    operation: "list",
    query: "select(*).order(data_compra desc)",
  });
  const list = (rows as any[]).map(fromInsumoRow);
  return {
    list,
    async save(next: ReturnType<typeof fromInsumoRow>[]) {
      await replaceById("insumos", next.map(toInsumoRow));
    },
  };
}
