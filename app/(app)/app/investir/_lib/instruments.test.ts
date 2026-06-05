import { describe, expect, it } from "vitest";

import { INVEST_GUIDE } from "./instruments";

describe("INVEST_GUIDE", () => {
  it("tem 3 tiers por objetivo", () => {
    expect(INVEST_GUIDE.tiers.map((t) => t.key)).toEqual(["reserva", "medio", "longo"]);
  });

  it("todo instrumento tem os 5 campos preenchidos", () => {
    for (const tier of INVEST_GUIDE.tiers) {
      expect(tier.instruments.length).toBeGreaterThan(0);
      for (const inst of tier.instruments) {
        for (const field of ["whatIs", "liquidity", "risk", "tax", "goodFor"] as const) {
          expect(inst[field].length).toBeGreaterThan(10);
        }
      }
    }
  });

  it("cobre cripto no tier de risco e tem disclaimer", () => {
    const longo = INVEST_GUIDE.tiers.find((t) => t.key === "longo");
    expect(longo?.instruments.some((i) => /cripto/i.test(i.name))).toBe(true);
    expect(INVEST_GUIDE.disclaimer.toLowerCase()).toContain("não recomendação");
  });

  it("intro preenchida", () => {
    expect(INVEST_GUIDE.intro.length).toBeGreaterThan(10);
  });
});
