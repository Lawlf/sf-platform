import { describe, expect, it } from "vitest";

import { COACHMARK_STEPS, clampIndex } from "./coachmark-steps";

describe("coachmark-steps", () => {
  it("has ordered steps each with a target selector and copy", () => {
    expect(COACHMARK_STEPS.length).toBeGreaterThanOrEqual(3);
    for (const s of COACHMARK_STEPS) {
      expect(s.target.startsWith('[data-tour="')).toBe(true);
      expect(typeof s.title).toBe("string");
      expect(typeof s.body).toBe("string");
    }
  });

  it("clampIndex keeps the index within bounds", () => {
    expect(clampIndex(-1)).toBe(0);
    expect(clampIndex(0)).toBe(0);
    expect(clampIndex(COACHMARK_STEPS.length - 1)).toBe(COACHMARK_STEPS.length - 1);
    expect(clampIndex(COACHMARK_STEPS.length + 5)).toBe(COACHMARK_STEPS.length - 1);
  });
});
