import { useQuery } from "@tanstack/react-query";
import { listInsumos } from "@/lib/api/data.functions";

export function useInsumos() {
  return useQuery({
    queryKey: ["insumos"],
    queryFn: () => listInsumos(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
