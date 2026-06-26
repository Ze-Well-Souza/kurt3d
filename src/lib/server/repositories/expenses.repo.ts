import { getSupabaseAdminClient } from "../supabase.server";
import { fromExpenseRow, toExpenseRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function expensesRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("expenses").select("*").order("data", { ascending: false }), {
    table: "expenses",
    operation: "list",
    query: "select(*).order(data desc)",
  });
  const list = (rows as any[]).map(fromExpenseRow);
  return {
    list,
    async save(next: ReturnType<typeof fromExpenseRow>[]) {
      await replaceById("expenses", next.map(toExpenseRow));
    },
  };
}
