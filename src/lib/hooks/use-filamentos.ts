import { useQuery } from "@tanstack/react-query";
import { listFilamentos } from "@/lib/api/data.functions";

export function useFilamentos() {
  return useQuery({
    queryKey: ["filamentos"],
    queryFn: () => listFilamentos(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
