import { describe, expect, it } from "vitest";
import { computeReservedByFilament, computeDisponivel, clampGrams } from "./inventory";
import type { InventoryTxn, Filamento } from "./types";

describe("inventory", () => {
  it("calcula reservado por filamento", () => {
    const txns: InventoryTxn[] = [
      { id: "1", filamentId: "f1", orderId: "o1", type: "reserve", grams: 50, createdAt: "2026-01-01" },
      { id: "2", filamentId: "f1", orderId: "o1", type: "consume", grams: 20, createdAt: "2026-01-01" },
      { id: "3", filamentId: "f1", orderId: "o2", type: "reserve", grams: 10, createdAt: "2026-01-01" },
      { id: "4", filamentId: "f1", orderId: "o2", type: "release", grams: 10, createdAt: "2026-01-01" },
    ];
    const r = computeReservedByFilament(txns);
    expect(r.f1).toBe(30);
  });

  it("calcula gramas disponiveis a partir do peso atual e reservado", () => {
    const f: Filamento = { id: "f1", sku: "PLA", marca: "M", cor: "Preto", material: "PLA", pesoInicial: 1000, pesoAtual: 500, precoPago: 80, dataCompra: "2026-01-01" };
    expect(computeDisponivel(f, 100)).toBe(400);
    expect(computeDisponivel(f, 600)).toBe(0);
  });

  it("clampGrams trata NaN e Infinity como 0", () => {
    expect(clampGrams(NaN)).toBe(0);
    expect(clampGrams(Infinity)).toBe(0);
    expect(clampGrams(-5)).toBe(0);
    expect(clampGrams(100)).toBe(100);
  });
});
