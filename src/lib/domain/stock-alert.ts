import type { Filamento, Insumo } from "./types";

export const FILAMENTO_LOW_STOCK_GRAMS = 200;
export const FILAMENTO_MEDIUM_STOCK_GRAMS = 400;
export const FILAMENTO_LOW_STOCK_PERCENT = 20;
export const FILAMENTO_MEDIUM_STOCK_PERCENT = 40;
export const INSUMO_LOW_STOCK_UNITS = 3;

export type StockAlertLevel = "low" | "medium" | "ok" | "unknown";

export function extractQuantityNumber(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!normalized) return null;
  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getFilamentoAlertLevel(input: Pick<Filamento, "pesoInicial" | "pesoAtual"> & {
  disponivelGrams?: number;
}) {
  const baseGrams = input.disponivelGrams ?? input.pesoAtual;
  const availableGrams = Number.isFinite(baseGrams) ? Math.max(0, baseGrams) : 0;
  const percent = input.pesoInicial > 0 ? (availableGrams / input.pesoInicial) * 100 : 0;

  if (availableGrams <= FILAMENTO_LOW_STOCK_GRAMS || percent <= FILAMENTO_LOW_STOCK_PERCENT) {
    return "low" as const;
  }
  if (availableGrams <= FILAMENTO_MEDIUM_STOCK_GRAMS || percent <= FILAMENTO_MEDIUM_STOCK_PERCENT) {
    return "medium" as const;
  }
  return "ok" as const;
}

export function getInsumoAlertLevel(insumo: Pick<Insumo, "quantidade">) {
  const quantityNumber = extractQuantityNumber(insumo.quantidade);
  if (quantityNumber === null) return "unknown" as const;
  if (quantityNumber <= INSUMO_LOW_STOCK_UNITS) return "low" as const;
  return "ok" as const;
}
