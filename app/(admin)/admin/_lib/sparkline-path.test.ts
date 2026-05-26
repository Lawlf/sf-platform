import { describe, expect, it } from "vitest";

import { buildSparklinePath } from "./sparkline-path";

describe("buildSparklinePath", () => {
  it("returns empty string for no points", () => {
    expect(buildSparklinePath([], 100, 30)).toBe("");
  });

  it("maps all-equal values to a flat line at y=0 (top)", () => {
    expect(buildSparklinePath([5, 5, 5], 100, 30)).toBe("M 0 0 L 50 0 L 100 0");
  });

  it("maps the max value to the top (y=0) and min to the bottom (y=height)", () => {
    const d = buildSparklinePath([0, 10], 100, 30);
    expect(d).toBe("M 0 30 L 100 0");
  });
});
