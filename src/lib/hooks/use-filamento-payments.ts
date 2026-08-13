import { listFilamentoPaymentEvents, listFilamentoPayments } from "@/lib/api/data.functions";
import { queryKeys } from "@/lib/query-keys";
import { createAdminQuery } from "./create-admin-query";

export const useFilamentoPayments = createAdminQuery(queryKeys.filamentoPayments, () =>
  listFilamentoPayments(),
);

export const useFilamentoPaymentEvents = createAdminQuery(queryKeys.filamentoPaymentEvents, () =>
  listFilamentoPaymentEvents(),
);
