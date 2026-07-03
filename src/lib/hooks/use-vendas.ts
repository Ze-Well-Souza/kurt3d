import { useQuery } from "@tanstack/react-query";
import { listVendas } from "@/lib/api/data.functions";

export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    queryFn: () => listVendas(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
