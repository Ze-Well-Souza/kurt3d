import { createCrudRepo } from "./crud-repo";
import { fromOrderPaymentRow, toOrderPaymentRow } from "./mappers";

// Pagamentos recebidos por pedido (fluxo de caixa).
export const orderPaymentsRepo = createCrudRepo({
  table: "order_payments",
  fromRow: fromOrderPaymentRow,
  toRow: toOrderPaymentRow,
  order: [{ column: "data", ascending: false }],
});
