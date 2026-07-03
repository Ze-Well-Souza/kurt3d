import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "@/lib/api/data.functions";

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: () => listExpenses(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
