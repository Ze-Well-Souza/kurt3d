import { getSupabaseAdminClient } from "../supabase.server";
import { fromFilamentoPaymentEventRow, toFilamentoPaymentEventRow } from "./mappers";
import { unwrapResult } from "./shared";

export async function filamentoPaymentEventsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(
    await supabase.from("filamento_payment_events").select("*").order("data_pagamento", { ascending: false }).order("created_at", { ascending: false }),
    {
      table: "filamento_payment_events",
      operation: "list",
      query: "select(*).order(data_pagamento desc, created_at desc)",
    },
  );
  const list = (rows as any[]).map(fromFilamentoPaymentEventRow);
  return {
    list,
    async insert(event: ReturnType<typeof fromFilamentoPaymentEventRow>) {
      unwrapResult(await supabase.from("filamento_payment_events").insert(toFilamentoPaymentEventRow(event)), {
        table: "filamento_payment_events",
        operation: "insert",
        query: "insert(event)",
        metadata: { eventId: event.id, installmentId: event.installmentId },
      });
    },
  };
}
