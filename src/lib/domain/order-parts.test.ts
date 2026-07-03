import { describe, expect, it } from "vitest";
import { normalizeOrderParts, computeOrderTotalsFromParts, summarizeOrderParts } from "./order-parts";
import type { OrderPart } from "./types";

describe("normalizeOrderParts", () => {
  it("reordena posicoes sequencialmente", () => {
    const parts: OrderPart[] = [
      { id: "p1", orderId: "o1", nome: "Parte A", position: 5, quantity: 1, timeMinutes: 30, gramsPerUnit: 10, status: "todo", notes: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "p2", orderId: "o1", nome: "Parte B", position: 1, quantity: 2, timeMinutes: 15, gramsPerUnit: 5, status: "todo", notes: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "p3", orderId: "o1", nome: "Parte C", position: 3, quantity: 1, timeMinutes: 60, gramsPerUnit: 20, status: "done", notes: "Teste", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const result = normalizeOrderParts(parts);
    expect(result[0].nome).toBe("Parte B");
    expect(result[0].position).toBe(0);
    expect(result[1].nome).toBe("Parte C");
    expect(result[1].position).toBe(1);
    expect(result[2].nome).toBe("Parte A");
    expect(result[2].position).toBe(2);
    expect(result).toHaveLength(3);
  });

  it("nao muta o array original", () => {
    const parts: OrderPart[] = [
      { id: "p1", orderId: "o1", nome: "A", position: 2, quantity: 1, timeMinutes: 10, gramsPerUnit: 5, status: "todo", notes: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "p2", orderId: "o1", nome: "B", position: 1, quantity: 1, timeMinutes: 10, gramsPerUnit: 5, status: "todo", notes: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ];
    const originalPositions = parts.map((p) => p.position);
    normalizeOrderParts(parts);
    expect(parts.map((p) => p.position)).toEqual(originalPositions);
  });

  it("retorna array vazio se vazio", () => {
    expect(normalizeOrderParts([])).toEqual([]);
  });
});

describe("computeOrderTotalsFromParts", () => {
  it("soma tempo e material de todas as partes", () => {
    const parts = [
      { quantity: 2, timeMinutes: 30, gramsPerUnit: 10 },
      { quantity: 1, timeMinutes: 60, gramsPerUnit: 20 },
      { quantity: 3, timeMinutes: 15, gramsPerUnit: 5 },
    ];
    const result = computeOrderTotalsFromParts(parts);
    // time: 2*30 + 1*60 + 3*15 = 60+60+45 = 165
    // grams: 2*10 + 1*20 + 3*5 = 20+20+15 = 55
    expect(result.timeMinutes).toBe(165);
    expect(result.gramsPerUnit).toBe(55);
  });

  it("retorna zero para array vazio", () => {
    const result = computeOrderTotalsFromParts([]);
    expect(result.timeMinutes).toBe(0);
    expect(result.gramsPerUnit).toBe(0);
  });
});

describe("summarizeOrderParts", () => {
  it("conta partes por status", () => {
    const parts = [
      { status: "done" },
      { status: "printing" },
      { status: "todo" },
      { status: "done" },
      { status: "falha" },
      { status: "printing" },
    ] as Pick<OrderPart, "status">[];
    const result = summarizeOrderParts(parts);
    expect(result.total).toBe(6);
    expect(result.done).toBe(2);
    expect(result.printing).toBe(2);
    expect(result.todo).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("retorna zeros para array vazio", () => {
    const result = summarizeOrderParts([]);
    expect(result.total).toBe(0);
    expect(result.todo).toBe(0);
    expect(result.printing).toBe(0);
    expect(result.done).toBe(0);
    expect(result.failed).toBe(0);
  });
});
