import { fromInsumoPaymentRow, toInsumoPaymentRow } from "./mappers";
import { createPaymentsRepo } from "./payment-repos";

export const insumoPaymentsRepo = createPaymentsRepo({
  repo: {
    table: "insumo_payments",
    fromRow: fromInsumoPaymentRow,
    toRow: toInsumoPaymentRow,
    order: [{ column: "created_at", ascending: false }],
  },
  // Um plano de insumo cobre um item so: o vinculo e feito pelo id do insumo.
  ownerTable: "insumos",
  ownerMatchColumn: "id",
  buildAttachPatch: (_insumoId, paymentId) => ({ payment_id: paymentId }),
});
