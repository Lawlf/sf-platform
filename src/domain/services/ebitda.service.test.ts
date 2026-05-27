import { describe, expect, it } from "vitest";

import { EbitdaService } from "./ebitda.service";

describe("EbitdaService.compute", () => {
  it("computes EBITDA and its margin", () => {
    const r = EbitdaService.compute({
      revenueCents: 10_000_00n,
      cogsCents: 4_000_00n,
      opexCents: 2_000_00n,
    });
    expect(Number(r.ebitdaCents) / 100).toBe(4000);
    expect(r.ebitdaMarginPct).toBeCloseTo(40, 5);
    expect(Number(r.totalCostsCents) / 100).toBe(6000);
    expect(r.zone).toBe("otima"); // 40% > 25%
  });

  it("goes negative when costs exceed revenue", () => {
    const r = EbitdaService.compute({
      revenueCents: 5_000_00n,
      cogsCents: 4_000_00n,
      opexCents: 2_000_00n,
    });
    expect(Number(r.ebitdaCents) / 100).toBe(-1000);
    expect(r.ebitdaMarginPct).toBeLessThan(0);
    expect(r.zone).toBe("negativa");
  });

  it("classifies the margin health zone", () => {
    // margem 8% => apertada
    expect(
      EbitdaService.compute({ revenueCents: 10_000_00n, cogsCents: 0n, opexCents: 9_200_00n }).zone,
    ).toBe("apertada");
    // margem 15% => saudável
    expect(
      EbitdaService.compute({ revenueCents: 10_000_00n, cogsCents: 0n, opexCents: 8_500_00n }).zone,
    ).toBe("saudavel");
  });
});
