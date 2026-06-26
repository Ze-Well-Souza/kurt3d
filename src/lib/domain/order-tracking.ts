import type { Order, Status } from "./types";

const STATUS_LABELS: Record<Status, string> = {
  todo: "A Fazer",
  printing: "Imprimindo",
  done: "Concluido",
  vendido: "Entregue",
  presente: "Entregue",
  falha: "Falha",
};

const STATUS_DESCRIPTIONS: Record<Status, string> = {
  todo: "Pedido confirmado e aguardando producao.",
  printing: "Pedido em producao na impressora.",
  done: "Pedido concluido e pronto para retirada ou envio.",
  vendido: "Pedido entregue ao cliente.",
  presente: "Pedido finalizado como presente.",
  falha: "Pedido finalizado com falha de impressao.",
};

export function getOrderTrackingCode(orderId: string) {
  return orderId.replace(/-/g, "").slice(0, 12).toUpperCase();
}

export function matchesOrderTrackingCode(orderId: string, code: string) {
  return getOrderTrackingCode(orderId) === code.trim().toUpperCase();
}

export function getOrderStatusLabel(status: Status) {
  return STATUS_LABELS[status] ?? status;
}

export function getOrderStatusDescription(status: Status) {
  return STATUS_DESCRIPTIONS[status] ?? status;
}

export function getOrderTrackingStep(status: Status) {
  if (status === "todo") return 1;
  if (status === "printing") return 2;
  return 3;
}

export function getOrderEstimatedDeliveryDate(order: Pick<Order, "status" | "createdAt" | "updatedAt" | "timeMinutes" | "quantity">) {
  if (order.status === "falha") return null;
  if (order.status === "done" || order.status === "vendido" || order.status === "presente") {
    return order.updatedAt || order.createdAt;
  }

  const baseDate = new Date(order.createdAt);
  const totalMinutes = Math.max(30, order.timeMinutes * Math.max(1, order.quantity));
  const productionDays = Math.max(1, Math.ceil(totalMinutes / 360));
  const extraQueueDays = order.status === "todo" ? 1 : 0;
  baseDate.setDate(baseDate.getDate() + productionDays + extraQueueDays);
  return baseDate.toISOString();
}

export function getOrderTrackingSummary(order: Pick<Order, "id" | "status" | "createdAt" | "updatedAt" | "timeMinutes" | "quantity">) {
  return {
    trackingCode: getOrderTrackingCode(order.id),
    statusLabel: getOrderStatusLabel(order.status),
    statusDescription: getOrderStatusDescription(order.status),
    step: getOrderTrackingStep(order.status),
    estimatedDeliveryAt: getOrderEstimatedDeliveryDate(order),
  };
}
