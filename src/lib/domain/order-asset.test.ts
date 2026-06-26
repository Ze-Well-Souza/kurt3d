import { describe, expect, it } from "vitest";
import {
  buildOrderAssetReference,
  getOrderAssetFileName,
  isOrderAssetReference,
  isValidOrderProjectReference,
  parseOrderAssetReference,
} from "./order-asset";

describe("order asset reference", () => {
  it("reconhece referencias internas de storage", () => {
    const reference = buildOrderAssetReference("order-models", "orders/2026-06-26/modelo.3mf");
    expect(isOrderAssetReference(reference)).toBe(true);
    expect(parseOrderAssetReference(reference)).toEqual({
      bucket: "order-models",
      path: "orders/2026-06-26/modelo.3mf",
    });
    expect(getOrderAssetFileName(reference)).toBe("modelo.3mf");
  });

  it("aceita url externa e referencia interna como fontes validas", () => {
    expect(isValidOrderProjectReference("https://makerworld.com/en/models/123")).toBe(true);
    expect(isValidOrderProjectReference("storage:order-models/orders/2026-06-26/modelo.stl")).toBe(true);
    expect(isValidOrderProjectReference("arquivo-local.stl")).toBe(false);
  });
});
