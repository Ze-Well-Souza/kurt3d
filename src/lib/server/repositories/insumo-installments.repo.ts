import { fromInsumoInstallmentRow, toInsumoInstallmentRow } from "./mappers";
import { createInstallmentsRepo } from "./payment-repos";

export const insumoInstallmentsRepo = createInstallmentsRepo({
  table: "insumo_payment_installments",
  fromRow: fromInsumoInstallmentRow,
  toRow: toInsumoInstallmentRow,
  order: [{ column: "numero", ascending: true }],
});
