import { describe, expect, it } from "vitest";
import { addCalendarMonthsIso, formatIsoDatePtBr, todayIso } from "./installments";

describe("installments", () => {
  it("avanca por meses reais preservando o dia quando possivel", () => {
    expect(addCalendarMonthsIso("2026-01-15", 1)).toBe("2026-02-15");
    expect(addCalendarMonthsIso("2026-01-15", 2)).toBe("2026-03-15");
  });

  it("trata corretamente fim de mes em meses mais curtos", () => {
    expect(addCalendarMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(addCalendarMonthsIso("2024-01-31", 1)).toBe("2024-02-29");
    expect(addCalendarMonthsIso("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("gera a data ISO de hoje", () => {
    expect(todayIso(new Date("2026-06-26T15:30:00.000Z"))).toBe("2026-06-26");
  });

  it("formata datas ISO sem deslocar o dia por timezone", () => {
    expect(formatIsoDatePtBr("2026-06-24")).toBe("24/06/2026");
  });
});
