import { useQuery } from "@tanstack/react-query";
import { listFilamentoPayments, listFilamentoPaymentEvents } from "@/lib/api/data.functions";

export function useFilamentoPayments() {
  return useQuery({
    queryKey: ["filamento-payments"],
    queryFn: () => listFilamentoPayments(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useFilamentoPaymentEvents() {
  return useQuery({
    queryKey: ["filamento-payment-events"],
    queryFn: () => listFilamentoPaymentEvents(),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
