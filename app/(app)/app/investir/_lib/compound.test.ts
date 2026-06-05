import { describe, expect, it } from "vitest";

import { compoundProjection } from "./compound";

describe("compoundProjection", () => {
  it("ano 0 = valor aplicado; cresce com juros compostos", () => {
    const p = compoundProjection({ amountCents: 100000n, annualRatePct: 10, years: 5 });
    expect(p.points).toHaveLength(6);
    expect(p.points[0]!.valueCents).toBe(100000n);
    // 1000 * 1.1^5 = 1610.51
    expect(p.finalCents).toBe(161051n);
  });

  it("taxa 0 mantém o valor", () => {
    const p = compoundProjection({ amountCents: 100000n, annualRatePct: 0, years: 10 });
    expect(p.finalCents).toBe(100000n);
  });
});
