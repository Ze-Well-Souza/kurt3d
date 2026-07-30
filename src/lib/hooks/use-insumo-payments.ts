import { useQuery } from "@tanstack/react-query";
import { listInsumoPayments, listInsumoPaymentEvents } from "@/lib/api/data.functions";

export function useInsumoPayments() {
  return useQuery({
    queryKey: ["insumo-payments"],
    queryFn: () => listInsumoPayments(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useInsumoPaymentEvents() {
  return useQuery({
    queryKey: ["insumo-payment-events"],
    queryFn: () => listInsumoPaymentEvents(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
