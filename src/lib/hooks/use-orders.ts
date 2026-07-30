import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/api/data.functions";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
