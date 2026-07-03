import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/api/data.functions";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
