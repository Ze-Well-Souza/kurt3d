import { listOrders } from "@/lib/api/data.functions";
import { queryKeys } from "@/lib/query-keys";
import { createAdminQuery } from "./create-admin-query";

export const useOrders = createAdminQuery(queryKeys.orders, () => listOrders());
