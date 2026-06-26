import { getSupabaseAdminClient } from "../supabase.server";
import { fromOrderRow, toOrderRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function ordersRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("orders").select("*").order("created_at", { ascending: false }), {
    table: "orders",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromOrderRow);
  return {
    list,
    async save(next: ReturnType<typeof fromOrderRow>[]) {
      await replaceById("orders", next.map(toOrderRow));
    },
  };
}
