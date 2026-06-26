import { getSupabaseAdminClient } from "../supabase.server";
import { fromPaymentRow, toPaymentRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function filamentoPaymentsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("filamento_payments").select("*").order("created_at", { ascending: false }), {
    table: "filamento_payments",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromPaymentRow);
  return {
    list,
    async save(next: ReturnType<typeof fromPaymentRow>[]) {
      await replaceById("filamento_payments", next.map(toPaymentRow));
    },
    async insert(payment: ReturnType<typeof fromPaymentRow>) {
      unwrapResult(await supabase.from("filamento_payments").insert(toPaymentRow(payment)), {
        table: "filamento_payments",
        operation: "insert",
        query: "insert(payment)",
        metadata: { paymentId: payment.id },
      });
    },
    async update(payment: ReturnType<typeof fromPaymentRow>) {
      unwrapResult(await supabase.from("filamento_payments").update(toPaymentRow(payment)).eq("id", payment.id), {
        table: "filamento_payments",
        operation: "update",
        query: "update().eq(id)",
        metadata: { paymentId: payment.id },
      });
    },
    async remove(id: string) {
      unwrapResult(await supabase.from("filamento_payments").delete().eq("id", id), {
        table: "filamento_payments",
        operation: "remove",
        query: "delete().eq(id)",
        metadata: { paymentId: id },
      });
    },
    async attachToBatch(batchId: string, paymentId: string) {
      unwrapResult(await supabase.from("filamentos").update({ payment_id: paymentId, batch_id: batchId }).eq("batch_id", batchId), {
        table: "filamentos",
        operation: "attachPaymentToBatch",
        query: "update(payment_id, batch_id).eq(batch_id)",
        metadata: { batchId, paymentId },
      });
    },
    async detachFromFilamentos(paymentId: string) {
      unwrapResult(await supabase.from("filamentos").update({ payment_id: null }).eq("payment_id", paymentId), {
        table: "filamentos",
        operation: "detachPaymentFromFilamentos",
        query: "update(payment_id=null).eq(payment_id)",
        metadata: { paymentId },
      });
    },
  };
}
