import { describe, it, expect } from "vitest";
import { timeToMinutes, minutesToTime, formatTimePreview } from "./time-utils";

describe("timeToMinutes", () => {
  it("converts hours and minutes to total minutes", () => {
    expect(timeToMinutes(2, 30)).toBe(150);
    expect(timeToMinutes(0, 45)).toBe(45);
    expect(timeToMinutes(5, 0)).toBe(300);
    expect(timeToMinutes(1, 15)).toBe(75);
  });

  it("handles zero values", () => {
    expect(timeToMinutes(0, 0)).toBe(0);
  });

  it("handles large hour values", () => {
    expect(timeToMinutes(999, 0)).toBe(59940);
    expect(timeToMinutes(999, 59)).toBe(59999);
  });
});

describe("minutesToTime", () => {
  it("converts total minutes to hours and minutes", () => {
    expect(minutesToTime(150)).toEqual({ hours: 2, minutes: 30 });
    expect(minutesToTime(45)).toEqual({ hours: 0, minutes: 45 });
    expect(minutesToTime(300)).toEqual({ hours: 5, minutes: 0 });
    expect(minutesToTime(75)).toEqual({ hours: 1, minutes: 15 });
  });

  it("handles zero", () => {
    expect(minutesToTime(0)).toEqual({ hours: 0, minutes: 0 });
  });

  it("handles large values", () => {
    expect(minutesToTime(59940)).toEqual({ hours: 999, minutes: 0 });
    expect(minutesToTime(59999)).toEqual({ hours: 999, minutes: 59 });
  });

  it("round-trip conversion: timeToMinutes → minutesToTime", () => {
    const cases = [
      { hours: 0, minutes: 0 },
      { hours: 0, minutes: 30 },
      { hours: 1, minutes: 0 },
      { hours: 3, minutes: 27 },
      { hours: 10, minutes: 45 },
      { hours: 999, minutes: 59 },
    ];

    for (const original of cases) {
      const total = timeToMinutes(original.hours, original.minutes);
      const result = minutesToTime(total);
      expect(result).toEqual(original);
    }
  });
});

describe("formatTimePreview", () => {
  it("formats zero as '0min'", () => {
    expect(formatTimePreview(0, 0)).toBe("0min");
  });

  it("formats minutes-only correctly", () => {
    expect(formatTimePreview(0, 30)).toBe("30min");
    expect(formatTimePreview(0, 1)).toBe("1min");
  });

  it("formats hours-only correctly", () => {
    expect(formatTimePreview(2, 0)).toBe("2h");
    expect(formatTimePreview(1, 0)).toBe("1h");
  });

  it("formats both hours and minutes correctly", () => {
    expect(formatTimePreview(2, 30)).toBe("2h 30min");
    expect(formatTimePreview(1, 15)).toBe("1h 15min");
    expect(formatTimePreview(10, 5)).toBe("10h 5min");
  });
});
