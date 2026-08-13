import { listBudgetQuotes } from "@/lib/api/data.functions";
import { queryKeys } from "@/lib/query-keys";
import { createAdminQuery } from "./create-admin-query";

export const useBudgetQuotes = createAdminQuery(queryKeys.budgetQuotes, () => listBudgetQuotes());
