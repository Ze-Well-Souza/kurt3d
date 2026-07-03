import { useQuery } from "@tanstack/react-query";
import { listCalendarEvents } from "@/lib/api/data.functions";

export function useCalendarEvents() {
  return useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => listCalendarEvents(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
