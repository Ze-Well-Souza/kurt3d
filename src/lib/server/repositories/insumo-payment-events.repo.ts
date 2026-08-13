import { createCrudRepo } from "./crud-repo";
import { fromInsumoPaymentEventRow, toInsumoPaymentEventRow } from "./mappers";

export const insumoPaymentEventsRepo = createCrudRepo({
  table: "insumo_payment_events",
  fromRow: fromInsumoPaymentEventRow,
  toRow: toInsumoPaymentEventRow,
  order: [
    { column: "data_pagamento", ascending: false },
    { column: "created_at", ascending: false },
  ],
});
