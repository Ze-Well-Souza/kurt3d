import { useQuery } from "@tanstack/react-query";
import { getDailyCashFlow, getWeeklyCashFlow, listOrderPayments } from "@/lib/api/data.functions";

// Hooks do fluxo de caixa: mesmos intervalos dos demais hooks financeiros,
// para que os dois sócios vejam as entradas quase em tempo real.

/** Lista completa de pagamentos recebidos (mais recentes primeiro). */
export function useOrderPayments() {
  return useQuery({
    queryKey: ["order-payments"],
    queryFn: () => listOrderPayments(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/** Resumo semanal (últimas N semanas, padrão 4). */
export function useWeeklyCashFlow(semanas?: number) {
  return useQuery({
    queryKey: ["cash-flow", "weekly", semanas ?? 4],
    queryFn: () => getWeeklyCashFlow({ data: semanas ? { semanas } : undefined }),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/** Resumo diário (padrão: hoje) com os pagamentos do dia para auditoria. */
export function useDailyCashFlow(dataIso?: string) {
  return useQuery({
    queryKey: ["cash-flow", "daily", dataIso ?? "hoje"],
    queryFn: () => getDailyCashFlow({ data: dataIso ? { data: dataIso } : undefined }),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
