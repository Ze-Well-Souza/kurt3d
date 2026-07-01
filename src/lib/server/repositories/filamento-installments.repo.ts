import { getSupabaseAdminClient } from "../supabase.server";
import { fromInstallmentRow, toInstallmentRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function filamentoInstallmentsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("filamento_payment_installments").select("*").order("numero", { ascending: true }), {
    table: "filamento_payment_installments",
    operation: "list",
    query: "select(*).order(numero asc)",
  });
  const list = (rows as any[]).map(fromInstallmentRow);
  return {
    list,
    async save(next: ReturnType<typeof fromInstallmentRow>[]) {
      await replaceById("filamento_payment_installments", next.map(toInstallmentRow));
    },
    async insertMany(items: ReturnType<typeof fromInstallmentRow>[]) {
      if (items.length === 0) return;
      unwrapResult(await supabase.from("filamento_payment_installments").insert(items.map(toInstallmentRow)), {
        table: "filamento_payment_installments",
        operation: "insertMany",
        query: "insert(items)",
        metadata: { count: items.length },
      });
    },
    async update(installment: ReturnType<typeof fromInstallmentRow>) {
      unwrapResult(await supabase.from("filamento_payment_installments").update(toInstallmentRow(installment)).eq("id", installment.id), {
        table: "filamento_payment_installments",
        operation: "update",
        query: "update().eq(id)",
        metadata: { installmentId: installment.id },
      });
    },
    async deleteByPayment(paymentId: string) {
      unwrapResult(await supabase.from("filamento_payment_installments").delete().eq("payment_id", paymentId), {
        table: "filamento_payment_installments",
        operation: "deleteByPayment",
        query: "delete().eq(payment_id)",
        metadata: { paymentId },
      });
    },
    async removeMany(ids: string[]) {
      if (ids.length === 0) return;
      unwrapResult(await supabase.from("filamento_payment_installments").delete().in("id", ids), {
        table: "filamento_payment_installments",
        operation: "removeMany",
        query: "delete().in(id)",
        metadata: { count: ids.length },
      });
    },
  };
}
