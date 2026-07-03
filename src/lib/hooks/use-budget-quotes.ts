import { useQuery } from "@tanstack/react-query";
import { listBudgetQuotes } from "@/lib/api/data.functions";

export function useBudgetQuotes() {
  return useQuery({
    queryKey: ["budget-quotes"],
    queryFn: () => listBudgetQuotes(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
