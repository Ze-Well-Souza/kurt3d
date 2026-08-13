import { describe, expect, it } from "vitest";
import {
  getOrderEstimatedDeliveryDate,
  getOrderTrackingCode,
  getOrderTrackingSummary,
  matchesOrderTrackingCode,
  buildTrackingCodeIdPrefix,
} from "./order-tracking";

describe("order tracking", () => {
  it("gera um codigo de acompanhamento deterministico", () => {
    expect(getOrderTrackingCode("12345678-90ab-cdef-1234-567890abcdef")).toBe("1234567890AB");
  });

  it("compara codigo de acompanhamento sem depender de maiusculas", () => {
    expect(matchesOrderTrackingCode("12345678-90ab-cdef-1234-567890abcdef", "1234567890ab")).toBe(
      true,
    );
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
    expect(
      getOrderTrackingSummary({
        id: "12345678-90ab-cdef-1234-567890abcdef",
        status: "printing",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T12:00:00.000Z",
        timeMinutes: 120,
        quantity: 2,
      }),
    ).toMatchObject({
      trackingCode: "1234567890AB",
      statusLabel: "Imprimindo",
      step: 2,
    });
  });
});

describe("buildTrackingCodeIdPrefix", () => {
  it("monta o prefixo do UUID a partir do codigo", () => {
    const id = "5b3877b6-9c4f-461d-aa78-c415c5092165";
    const code = getOrderTrackingCode(id);
    expect(code).toBe("5B3877B69C4F");
    expect(buildTrackingCodeIdPrefix(code)).toBe("5b3877b6-9c4f");
    expect(id.startsWith(buildTrackingCodeIdPrefix(code)!)).toBe(true);
  });

  it("aceita codigo digitado em minusculas ou com hifens", () => {
    expect(buildTrackingCodeIdPrefix("5b3877b6-9c4f")).toBe("5b3877b6-9c4f");
    expect(buildTrackingCodeIdPrefix("  5B3877B69C4F  ")).toBe("5b3877b6-9c4f");
  });

  it("recusa codigo com tamanho ou caracteres invalidos", () => {
    expect(buildTrackingCodeIdPrefix("ABC")).toBeNull();
    expect(buildTrackingCodeIdPrefix("ZZZZZZZZZZZZ")).toBeNull();
    expect(buildTrackingCodeIdPrefix("5B3877B69C4F00")).toBeNull();
  });
});
