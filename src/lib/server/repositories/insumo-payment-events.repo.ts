import { getSupabaseAdminClient } from "../supabase.server";
import { fromInsumoPaymentEventRow, toInsumoPaymentEventRow } from "./mappers";
import { unwrapResult } from "./shared";

export async function insumoPaymentEventsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(
    await supabase.from("insumo_payment_events").select("*").order("data_pagamento", { ascending: false }).order("created_at", { ascending: false }),
    {
      table: "insumo_payment_events",
      operation: "list",
      query: "select(*).order(data_pagamento desc, created_at desc)",
    },
  );
  const list = (rows as any[]).map(fromInsumoPaymentEventRow);
  return {
    list,
    async insert(event: ReturnType<typeof fromInsumoPaymentEventRow>) {
      unwrapResult(await supabase.from("insumo_payment_events").insert(toInsumoPaymentEventRow(event)), {
        table: "insumo_payment_events",
        operation: "insert",
        query: "insert(event)",
        metadata: { eventId: event.id, installmentId: event.installmentId },
      });
    },
  };
}
