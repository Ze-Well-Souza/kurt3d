import { describe, expect, it } from "vitest";
import { computeReservedByFilament } from "./inventory";
import type { InventoryTxn } from "./types";

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
});

