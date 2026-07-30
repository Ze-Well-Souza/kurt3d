import { useQuery } from "@tanstack/react-query";
import { listClients } from "@/lib/api/data.functions";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => listClients(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
