import { fromInstallmentRow, toInstallmentRow } from "./mappers";
import { createInstallmentsRepo } from "./payment-repos";

export const filamentoInstallmentsRepo = createInstallmentsRepo({
  table: "filamento_payment_installments",
  fromRow: fromInstallmentRow,
  toRow: toInstallmentRow,
  order: [{ column: "numero", ascending: true }],
});
