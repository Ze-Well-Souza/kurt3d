import { useQuery } from "@tanstack/react-query";
import { listLeads } from "@/lib/api/data.functions";

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeads(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
