import type { Order, OrderDestino } from "@/lib/domain/types";

/** Assinatura comum do callback de finalizacao usado em Order Card / Kanban Column. */
export type FinalizarPedidoArgs = {
  orderId: string;
  destino: OrderDestino;
  valorRecebido?: number;
  formaPagamento?: string;
  dataPagamento?: string;
};

export const PAYMENT_METHODS = [
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Dinheiro",
  "Transferência",
] as const;

export const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  vendido: { label: "Vendido", color: "var(--filament-green)" },
  presente: { label: "Presente", color: "var(--filament-yellow)" },
  falha: { label: "Falha", color: "var(--filament-magenta)" },
};

export function formatTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function getPaymentBadge(order: Order) {
  const hasFinancialIntent =
    order.status === "vendido" || !!order.formaPagamento || order.valorRecebido !== undefined;
  if (!hasFinancialIntent) return null;
  if (order.dataPagamento) {
    return { label: "Pago", className: "border-green-600/30 bg-green-50 text-green-700" };
  }
  return { label: "Pendente", className: "border-yellow-600/30 bg-yellow-50 text-yellow-700" };
}
