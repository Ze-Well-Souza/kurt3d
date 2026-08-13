import { fromPaymentRow, toPaymentRow } from "./mappers";
import { createPaymentsRepo } from "./payment-repos";

export const filamentoPaymentsRepo = createPaymentsRepo({
  repo: {
    table: "filamento_payments",
    fromRow: fromPaymentRow,
    toRow: toPaymentRow,
    order: [{ column: "created_at", ascending: false }],
  },
  // Um plano de filamento cobre um lote inteiro: o vinculo e feito por batch_id.
  ownerTable: "filamentos",
  ownerMatchColumn: "batch_id",
  buildAttachPatch: (batchId, paymentId) => ({ payment_id: paymentId, batch_id: batchId }),
});
