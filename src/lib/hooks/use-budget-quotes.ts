import { useQuery } from "@tanstack/react-query";
import { listBudgetQuotes } from "@/lib/api/data.functions";

export function useBudgetQuotes() {
  return useQuery({
    queryKey: ["budget-quotes"],
    queryFn: () => listBudgetQuotes(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
