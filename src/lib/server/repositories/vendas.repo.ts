import { getSupabaseAdminClient } from "../supabase.server";
import { fromVendaRow, toVendaRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function vendasRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("vendas").select("*").order("data", { ascending: false }), {
    table: "vendas",
    operation: "list",
    query: "select(*).order(data desc)",
  });
  const list = (rows as any[]).map(fromVendaRow);
  return {
    list,
    async save(next: ReturnType<typeof fromVendaRow>[]) {
      await replaceById("vendas", next.map(toVendaRow));
    },
  };
}
