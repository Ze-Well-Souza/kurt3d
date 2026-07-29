import { getSupabaseAdminClient } from "../supabase.server";
import { fromOrderPaymentRow, toOrderPaymentRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

// Repositório de pagamentos recebidos por pedido (fluxo de caixa).
export async function orderPaymentsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("order_payments").select("*").order("data", { ascending: false }), {
    table: "order_payments",
    operation: "list",
    query: "select(*).order(data desc)",
  });
  const list = (rows as any[]).map(fromOrderPaymentRow);
  return {
    list,
    async save(next: ReturnType<typeof fromOrderPaymentRow>[]) {
      await replaceById("order_payments", next.map(toOrderPaymentRow));
    },
  };
}
