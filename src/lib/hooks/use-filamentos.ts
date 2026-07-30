import { useQuery } from "@tanstack/react-query";
import { listFilamentos } from "@/lib/api/data.functions";

export function useFilamentos() {
  return useQuery({
    queryKey: ["filamentos"],
    queryFn: () => listFilamentos(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
