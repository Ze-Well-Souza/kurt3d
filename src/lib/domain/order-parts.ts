import type { OrderPart } from "./types";

export function normalizeOrderParts(parts: OrderPart[]) {
  return [...parts].sort((a, b) => a.position - b.position).map((part, index) => ({
    ...part,
    position: index,
  }));
}

export function computeOrderTotalsFromParts(parts: Pick<OrderPart, "quantity" | "timeMinutes" | "gramsPerUnit">[]) {
  return parts.reduce(
    (acc, part) => {
      acc.timeMinutes += part.timeMinutes * part.quantity;
      acc.gramsPerUnit += part.gramsPerUnit * part.quantity;
      return acc;
    },
    { timeMinutes: 0, gramsPerUnit: 0 },
  );
}

export function summarizeOrderParts(parts: Pick<OrderPart, "status">[]) {
  return parts.reduce(
    (acc, part) => {
      acc.total += 1;
      if (part.status === "done") acc.done += 1;
      if (part.status === "printing") acc.printing += 1;
      if (part.status === "falha") acc.failed += 1;
      if (part.status === "todo") acc.todo += 1;
      return acc;
    },
    { total: 0, todo: 0, printing: 0, done: 0, failed: 0 },
  );
}
