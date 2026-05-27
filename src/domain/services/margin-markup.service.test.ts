import { describe, expect, it } from "vitest";

import { MarginMarkupService } from "./margin-markup.service";

describe("MarginMarkupService", () => {
  it("derives profit, margin and markup from cost and price", () => {
    const r = MarginMarkupService.fromCostPrice({ costCents: 100_00n, priceCents: 150_00n });
    expect(Number(r.profitCents) / 100).toBe(50);
    expect(r.marginPct).toBeCloseTo(33.333, 2); // 50/150
    expect(r.markupPct).toBeCloseTo(50, 5); // 50/100
  });

  it("clears the Shark Tank confusion: 150% markup = 60% margin", () => {
    // markup 150% sobre custo 100 => preço 250
    const price = MarginMarkupService.priceForMarkup({ costCents: 100_00n, markupPct: 150 });
    expect(Number(price) / 100).toBeCloseTo(250, 2);
    const r = MarginMarkupService.fromCostPrice({ costCents: 100_00n, priceCents: price });
    expect(r.marginPct).toBeCloseTo(60, 4);
    expect(r.markupPct).toBeCloseTo(150, 4);
  });

  it("computes the price for a desired margin", () => {
    // margem 60% sobre custo 100 => preço 250
    const price = MarginMarkupService.priceForMargin({ costCents: 100_00n, marginPct: 60 });
    expect(Number(price) / 100).toBeCloseTo(250, 2);
  });

  it("returns zero price for an impossible margin (>= 100%)", () => {
    expect(MarginMarkupService.priceForMargin({ costCents: 100_00n, marginPct: 100 })).toBe(0n);
    expect(MarginMarkupService.priceForMargin({ costCents: 100_00n, marginPct: 150 })).toBe(0n);
  });
});
