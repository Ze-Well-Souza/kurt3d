import { describe, expect, it } from "vitest";
import {
  getOrderEstimatedDeliveryDate,
  getOrderTrackingCode,
  getOrderTrackingSummary,
  matchesOrderTrackingCode,
} from "./order-tracking";

describe("order tracking", () => {
  it("gera um codigo de acompanhamento deterministico", () => {
    expect(getOrderTrackingCode("12345678-90ab-cdef-1234-567890abcdef")).toBe("1234567890AB");
  });

  it("compara codigo de acompanhamento sem depender de maiusculas", () => {
    expect(matchesOrderTrackingCode("12345678-90ab-cdef-1234-567890abcdef", "1234567890ab")).toBe(true);
  });

  it("estima entrega futura para pedido em fila", () => {
    const estimated = getOrderEstimatedDeliveryDate({
      status: "todo",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
      timeMinutes: 600,
      quantity: 1,
    });

    expect(estimated).toBe("2026-06-29T10:00:00.000Z");
  });

  it("resume acompanhamento para tela publica", () => {
    expect(getOrderTrackingSummary({
      id: "12345678-90ab-cdef-1234-567890abcdef",
      status: "printing",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T12:00:00.000Z",
      timeMinutes: 120,
      quantity: 2,
    })).toMatchObject({
      trackingCode: "1234567890AB",
      statusLabel: "Imprimindo",
      step: 2,
    });
  });
});
