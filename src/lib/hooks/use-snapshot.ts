import { useQuery } from "@tanstack/react-query";
import { listSnapshot } from "@/lib/api/data.functions";

export function useSnapshot() {
  return useQuery({
    queryKey: ["snapshot"],
    queryFn: () => listSnapshot(),
  });
}
