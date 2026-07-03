import { useQuery } from "@tanstack/react-query";
import { listPortfolio } from "@/lib/api/data.functions";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => listPortfolio(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
