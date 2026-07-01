import { getSupabaseAdminClient } from "../supabase.server";
import { fromInsumoInstallmentRow, toInsumoInstallmentRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function insumoInstallmentsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("insumo_payment_installments").select("*").order("numero", { ascending: true }), {
    table: "insumo_payment_installments",
    operation: "list",
    query: "select(*).order(numero asc)",
  });
  const list = (rows as any[]).map(fromInsumoInstallmentRow);
  return {
    list,
    async save(next: ReturnType<typeof fromInsumoInstallmentRow>[]) {
      await replaceById("insumo_payment_installments", next.map(toInsumoInstallmentRow));
    },
    async insertMany(items: ReturnType<typeof fromInsumoInstallmentRow>[]) {
      if (items.length === 0) return;
      unwrapResult(await supabase.from("insumo_payment_installments").insert(items.map(toInsumoInstallmentRow)), {
        table: "insumo_payment_installments",
        operation: "insertMany",
        query: "insert(items)",
        metadata: { count: items.length },
      });
    },
    async update(installment: ReturnType<typeof fromInsumoInstallmentRow>) {
      unwrapResult(await supabase.from("insumo_payment_installments").update(toInsumoInstallmentRow(installment)).eq("id", installment.id), {
        table: "insumo_payment_installments",
        operation: "update",
        query: "update().eq(id)",
        metadata: { installmentId: installment.id },
      });
    },
    async deleteByPayment(paymentId: string) {
      unwrapResult(await supabase.from("insumo_payment_installments").delete().eq("payment_id", paymentId), {
        table: "insumo_payment_installments",
        operation: "deleteByPayment",
        query: "delete().eq(payment_id)",
        metadata: { paymentId },
      });
    },
  };
}
