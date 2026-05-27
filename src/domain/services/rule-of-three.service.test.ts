import { describe, expect, it } from "vitest";

import { RuleOfThreeService } from "./rule-of-three.service";

describe("RuleOfThreeService.solve", () => {
  it("solves a direct proportion (3 maçãs custam 12 -> 5 custam 20)", () => {
    const r = RuleOfThreeService.solve({ a: 3, b: 12, c: 5, kind: "direct" });
    expect(r.x).toBeCloseTo(20, 6);
  });

  it("solves an inverse proportion (4 pedreiros em 6 dias -> 8 em 3 dias)", () => {
    const r = RuleOfThreeService.solve({ a: 4, b: 6, c: 8, kind: "inverse" });
    expect(r.x).toBeCloseTo(3, 6);
  });

  it("handles decimals", () => {
    const r = RuleOfThreeService.solve({ a: 2, b: 5, c: 7, kind: "direct" });
    expect(r.x).toBeCloseTo(17.5, 6);
  });

  it("returns null when dividing by zero (direct: a = 0)", () => {
    const r = RuleOfThreeService.solve({ a: 0, b: 12, c: 5, kind: "direct" });
    expect(r.x).toBeNull();
  });

  it("returns null when dividing by zero (inverse: c = 0)", () => {
    const r = RuleOfThreeService.solve({ a: 4, b: 6, c: 0, kind: "inverse" });
    expect(r.x).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    const r = RuleOfThreeService.solve({ a: Number.NaN, b: 1, c: 1, kind: "direct" });
    expect(r.x).toBeNull();
  });
});
