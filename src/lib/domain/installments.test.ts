import { describe, expect, it } from "vitest";
import {
  addCalendarMonthsIso,
  formatDateToIsoLocal,
  formatIsoDatePtBr,
  parseIsoDateLocal,
  todayIso,
} from "./installments";

describe("formatDateToIsoLocal", () => {
  it("formats date to YYYY-MM-DD", () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    expect(formatDateToIsoLocal(date)).toBe("2024-01-15");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2024, 2, 5); // Mar 5, 2024
    expect(formatDateToIsoLocal(date)).toBe("2024-03-05");
  });
});

describe("parseIsoDateLocal", () => {
  it("parses YYYY-MM-DD to Date", () => {
    const date = parseIsoDateLocal("2024-06-15");
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(5); // 0-indexed
    expect(date.getDate()).toBe(15);
  });

  it("handles malformed input gracefully", () => {
    const date = parseIsoDateLocal("");
    expect(date instanceof Date).toBe(true);
  });
});

describe("todayIso", () => {
  it("returns today in YYYY-MM-DD format", () => {
    const result = todayIso(new Date(2024, 0, 1));
    expect(result).toBe("2024-01-01");
  });
});

describe("addCalendarMonthsIso", () => {
  it("adds months within the same year", () => {
    expect(addCalendarMonthsIso("2024-01-15", 2)).toBe("2024-03-15");
  });

  it("adds months crossing year boundary", () => {
    expect(addCalendarMonthsIso("2024-10-15", 4)).toBe("2025-02-15");
  });

  it("clamps to last day of month when original day exceeds target month days", () => {
    // Jan 31 + 1 month = Feb 28/29 (not Feb 31)
    const result = addCalendarMonthsIso("2024-01-31", 1);
    expect(result).toBe("2024-02-29"); // 2024 is leap year
  });

  it("handles month overflow correctly (e.g., Jan 30 + 1 month = Feb 29 in leap year)", () => {
    const result = addCalendarMonthsIso("2024-01-30", 1);
    expect(result).toBe("2024-02-29"); // 2024 is leap year
  });

  it("handles non-leap year February clamping", () => {
    // 2023-01-31 + 1 month → Feb has 28 days
    const result = addCalendarMonthsIso("2023-01-31", 1);
    expect(result).toBe("2023-02-28");
  });

  it("returns same date when months = 0", () => {
    expect(addCalendarMonthsIso("2024-06-15", 0)).toBe("2024-06-15");
  });

  it("handles multiple year crossing", () => {
    expect(addCalendarMonthsIso("2024-01-15", 24)).toBe("2026-01-15");
    expect(addCalendarMonthsIso("2024-01-15", 36)).toBe("2027-01-15");
  });
});

describe("formatIsoDatePtBr", () => {
  it("formats ISO date to pt-BR locale", () => {
    // We test the format pattern, not exact string, since locale may differ in CI
    const result = formatIsoDatePtBr("2024-06-15");
    expect(result).toContain("2024");
  });

  it("handles ISO datetime string", () => {
    const result = formatIsoDatePtBr("2024-06-15T10:30:00.000Z");
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("formata datas ISO sem deslocar o dia por timezone", () => {
    expect(formatIsoDatePtBr("2026-06-24")).toBe("24/06/2026");
  });
});

