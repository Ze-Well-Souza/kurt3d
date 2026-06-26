import { useQuery } from "@tanstack/react-query";
import { listPublicSnapshot } from "@/lib/api/data.functions";

export function usePublicSnapshot() {
  return useQuery({
    queryKey: ["public-snapshot"],
    queryFn: () => listPublicSnapshot(),
    staleTime: 30_000,
  });
}
