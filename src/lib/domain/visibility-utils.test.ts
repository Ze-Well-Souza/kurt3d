import { describe, it, expect } from "vitest";
import { computePublishedAt } from "./visibility-utils";

const FAKE_NOW = "2026-07-11T12:00:00.000Z";
const OLD_DATE = "2026-01-15T10:30:00.000Z";

describe("computePublishedAt", () => {
  // Property: Private → Public sets new timestamp (Requirement 7, 6.2)
  it("sets new publishedAt when transitioning from private to public", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ false,
      /* newIsPublic        */ true,
      /* currentPublishedAt */ null,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBe(FAKE_NOW);
  });

  // Property: Public → Public preserves existing timestamp
  it("preserves existing publishedAt when staying public", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ true,
      /* newIsPublic        */ true,
      /* currentPublishedAt */ OLD_DATE,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBe(OLD_DATE);
  });

  // Property: Public → Private preserves timestamp (history) (Requirement 7.7)
  it("preserves publishedAt when transitioning from public to private", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ true,
      /* newIsPublic        */ false,
      /* currentPublishedAt */ OLD_DATE,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBe(OLD_DATE);
  });

  // Property: Private → Private stays null
  it("returns null when staying private with null publishedAt", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ false,
      /* newIsPublic        */ false,
      /* currentPublishedAt */ null,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBeNull();
  });

  // Property: Public with null publishedAt → Public sets now (defensive) (Requirement 7.6)
  it("sets now when staying public but publishedAt was null (defensive)", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ true,
      /* newIsPublic        */ true,
      /* currentPublishedAt */ null,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBe(FAKE_NOW);
  });

  // Property: Legacy missing isPublic (undefined → true) transitioning to public
  it("handles legacy projects with missing isPublic (treated as public)", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ true, // legacy treated as public
      /* newIsPublic        */ true,
      /* currentPublishedAt */ undefined,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBe(FAKE_NOW); // Defensive: null → sets now
  });

  // Edge: Legacy private staying private with undefined publishedAt
  it("returns null for legacy private staying private", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ false,
      /* newIsPublic        */ false,
      /* currentPublishedAt */ undefined,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBeNull();
  });

  // Edge: Private → Public with existing publishedAt (should still set new)
  it("overwrites old publishedAt when transitioning private → public", () => {
    const result = computePublishedAt(
      /* currentIsPublic    */ false,
      /* newIsPublic        */ true,
      /* currentPublishedAt */ OLD_DATE,
      /* now                */ FAKE_NOW,
    );
    expect(result).toBe(FAKE_NOW); // Transition always sets new
  });
});
