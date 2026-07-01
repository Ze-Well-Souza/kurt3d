import { getSupabaseAdminClient } from "../supabase.server";
import { fromInsumoPaymentRow, toInsumoPaymentRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function insumoPaymentsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("insumo_payments").select("*").order("created_at", { ascending: false }), {
    table: "insumo_payments",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromInsumoPaymentRow);
  return {
    list,
    async save(next: ReturnType<typeof fromInsumoPaymentRow>[]) {
      await replaceById("insumo_payments", next.map(toInsumoPaymentRow));
    },
    async insert(payment: ReturnType<typeof fromInsumoPaymentRow>) {
      unwrapResult(await supabase.from("insumo_payments").insert(toInsumoPaymentRow(payment)), {
        table: "insumo_payments",
        operation: "insert",
        query: "insert(payment)",
        metadata: { paymentId: payment.id },
      });
    },
    async update(payment: ReturnType<typeof fromInsumoPaymentRow>) {
      unwrapResult(await supabase.from("insumo_payments").update(toInsumoPaymentRow(payment)).eq("id", payment.id), {
        table: "insumo_payments",
        operation: "update",
        query: "update().eq(id)",
        metadata: { paymentId: payment.id },
      });
    },
    async remove(id: string) {
      unwrapResult(await supabase.from("insumo_payments").delete().eq("id", id), {
        table: "insumo_payments",
        operation: "remove",
        query: "delete().eq(id)",
        metadata: { paymentId: id },
      });
    },
    async attachToInsumo(insumoId: string, paymentId: string) {
      unwrapResult(await supabase.from("insumos").update({ payment_id: paymentId }).eq("id", insumoId), {
        table: "insumos",
        operation: "attachPaymentToInsumo",
        query: "update(payment_id).eq(id)",
        metadata: { insumoId, paymentId },
      });
    },
    async detachFromInsumo(paymentId: string) {
      unwrapResult(await supabase.from("insumos").update({ payment_id: null }).eq("payment_id", paymentId), {
        table: "insumos",
        operation: "detachPaymentFromInsumo",
        query: "update(payment_id=null).eq(payment_id)",
        metadata: { paymentId },
      });
    },
  };
}
