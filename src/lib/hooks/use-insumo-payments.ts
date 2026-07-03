import { useQuery } from "@tanstack/react-query";
import { listInsumoPayments, listInsumoPaymentEvents } from "@/lib/api/data.functions";

export function useInsumoPayments() {
  return useQuery({
    queryKey: ["insumo-payments"],
    queryFn: () => listInsumoPayments(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useInsumoPaymentEvents() {
  return useQuery({
    queryKey: ["insumo-payment-events"],
    queryFn: () => listInsumoPaymentEvents(),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
