import { createCrudRepo } from "./crud-repo";
import { fromFilamentoPaymentEventRow, toFilamentoPaymentEventRow } from "./mappers";

export const filamentoPaymentEventsRepo = createCrudRepo({
  table: "filamento_payment_events",
  fromRow: fromFilamentoPaymentEventRow,
  toRow: toFilamentoPaymentEventRow,
  order: [
    { column: "data_pagamento", ascending: false },
    { column: "created_at", ascending: false },
  ],
});
