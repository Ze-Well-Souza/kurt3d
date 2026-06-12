import type { Filamento, InventoryTxn } from "./types";

export function computeReservedByFilament(txns: InventoryTxn[]): Record<string, number> {
  const reserved: Record<string, number> = {};
  for (const t of txns) {
    if (t.type === "reserve") {
      reserved[t.filamentId] = (reserved[t.filamentId] ?? 0) + t.grams;
      continue;
    }
    if (t.type === "release") {
      reserved[t.filamentId] = (reserved[t.filamentId] ?? 0) - t.grams;
      continue;
    }
    if (t.type === "consume") {
      reserved[t.filamentId] = (reserved[t.filamentId] ?? 0) - t.grams;
    }
  }
  for (const k of Object.keys(reserved)) {
    reserved[k] = Math.max(0, reserved[k] ?? 0);
  }
  return reserved;
}

export function computeDisponivel(f: Filamento, reservedGrams: number) {
  return Math.max(0, f.pesoAtual - Math.max(0, reservedGrams));
}

export function clampGrams(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

