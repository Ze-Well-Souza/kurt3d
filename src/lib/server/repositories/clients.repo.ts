import { getSupabaseAdminClient } from "../supabase.server";
import { fromClientRow, toClientRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function clientsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("clients").select("*").order("nome", { ascending: true }), {
    table: "clients",
    operation: "list",
    query: "select(*).order(nome asc)",
  });
  const list = (rows as any[]).map(fromClientRow);
  return {
    list,
    async save(next: ReturnType<typeof fromClientRow>[]) {
      await replaceById("clients", next.map(toClientRow));
    },
  };
}
