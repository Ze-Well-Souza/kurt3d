import { useQuery } from "@tanstack/react-query";
import { listSettings } from "@/lib/api/data.functions";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => listSettings(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
