import { listInsumoPaymentEvents, listInsumoPayments } from "@/lib/api/data.functions";
import { queryKeys } from "@/lib/query-keys";
import { createAdminQuery } from "./create-admin-query";

export const useInsumoPayments = createAdminQuery(queryKeys.insumoPayments, () =>
  listInsumoPayments(),
);

export const useInsumoPaymentEvents = createAdminQuery(queryKeys.insumoPaymentEvents, () =>
  listInsumoPaymentEvents(),
);
