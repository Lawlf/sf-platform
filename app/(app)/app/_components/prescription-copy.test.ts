import { describe, expect, it } from "vitest";

import { ESTIMATED_INCOME_NOTE, presentMove, tightKindOf } from "./prescription-copy";

describe("ESTIMATED_INCOME_NOTE", () => {
  it("is exported and non-empty", () => {
    expect(typeof ESTIMATED_INCOME_NOTE).toBe("string");
    expect(ESTIMATED_INCOME_NOTE.length).toBeGreaterThan(0);
  });
});

describe("presentMove", () => {
  it("pay_debt (amortizing) shows reais saved + months", () => {
    const c = presentMove({
      type: "pay_debt", reasonCode: "highest_rate", targetDebtLabel: "Crédito pessoal", targetDebtId: "l",
      metrics: { interestSavedReais: 1240, monthsSaved: 4, baselineNeverPayoff: false, monthsToPayoff: 10 },
      rankImpactReais: 1240,
    });
    expect(c.headline).toContain("Crédito pessoal");
    expect(c.impact).toContain("R$");
    expect(c.impact).toMatch(/4 (meses|mês)/);
    expect(c.reason.length).toBeGreaterThan(0);
  });

  it("pay_debt (never-payoff) does NOT show a fictional reais figure and mentions it won't clear on minimum", () => {
    const c = presentMove({
      type: "pay_debt", reasonCode: "highest_rate", targetDebtLabel: "Nubank", targetDebtId: "n",
      metrics: { baselineNeverPayoff: true, monthsToPayoff: 7 },
      rankImpactReais: 99999,
    });
    expect(c.headline).toContain("Nubank");
    expect(c.impact.toLowerCase()).toMatch(/mínimo|não quita|nunca|zera|quita/);
    expect(c.impact).toMatch(/7 (meses|mês)/);
  });

  it("build_reserve mentions months to reach the cushion", () => {
    const c = presentMove({
      type: "build_reserve", reasonCode: "below_reserve_floor",
      metrics: { reserveGapReais: 5000, monthsToReserve: 5, monthlyContributionReais: 1000 },
      rankImpactReais: 5000,
    });
    expect(c.impact).toContain("R$");
    expect(c.impact).toMatch(/5 meses/);
  });

  it("invest shows monthly contribution and projected growth", () => {
    const c = presentMove({
      type: "invest", reasonCode: "no_expensive_debt_reserve_ok",
      metrics: { monthlyContributionReais: 1000, projectedGrowthReais: 320 },
      rankImpactReais: 320,
    });
    expect(c.impact).toContain("R$");
    expect(c.reason.length).toBeGreaterThan(0);
  });

  it("reduce_commitment states a reduction amount and never uses imperative 'você deve'", () => {
    const c = presentMove({
      type: "reduce_commitment", reasonCode: "negative_free_balance",
      metrics: { targetReductionReais: 300 }, rankImpactReais: 300,
    });
    expect(c.impact).toContain("R$");
    expect(`${c.headline} ${c.impact} ${c.reason}`.toLowerCase()).not.toContain("você deve");
  });
});

describe("tightKindOf", () => {
  it("negative free balance is deficit", () => {
    expect(tightKindOf({ committedPct: 40, freeBalanceReais: -200 })).toBe("deficit");
  });
  it("committed >= 100 with positive free is squeezed, not over_committed", () => {
    expect(tightKindOf({ committedPct: 111, freeBalanceReais: 50 })).toBe("squeezed");
  });
  it("committed 50-100 with positive free is squeezed", () => {
    expect(tightKindOf({ committedPct: 70, freeBalanceReais: 150 })).toBe("squeezed");
  });
  it("committed exactly 100 with zero free is over_committed", () => {
    expect(tightKindOf({ committedPct: 100, freeBalanceReais: 0 })).toBe("over_committed");
  });
  it("committed >= 100 but positive free is squeezed, not over_committed (no contradiction)", () => {
    expect(tightKindOf({ committedPct: 110, freeBalanceReais: 950 })).toBe("squeezed");
  });
  it("committed >= 100 with non-positive free is over_committed", () => {
    expect(tightKindOf({ committedPct: 110, freeBalanceReais: 0 })).toBe("over_committed");
  });
});

describe("presentMove reduce_commitment sub-states", () => {
  it("deficit: speaks of the month not closing, never of saving/investing", () => {
    const c = presentMove(
      { type: "reduce_commitment", reasonCode: "negative_free_balance", metrics: { targetReductionReais: 656 }, rankImpactReais: 656 },
      { committedPct: 90, freeBalanceReais: -656 },
    );
    const all = `${c.headline} ${c.impact} ${c.reason}`.toLowerCase();
    expect(all).toContain("r$");
    expect(all).not.toMatch(/guardar|investir|render/);
  });

  it("over_committed: names the installments-over-income situation", () => {
    const c = presentMove(
      { type: "reduce_commitment", reasonCode: "income_over_committed", metrics: { targetReductionReais: 300 }, rankImpactReais: 300 },
      { committedPct: 120, freeBalanceReais: 0 },
    );
    expect(c.headline.toLowerCase()).toContain("parcelas");
    expect(c.impact).toContain("R$");
  });

  it("squeezed: frames a thin leftover, suggests opening room before saving", () => {
    const c = presentMove(
      { type: "reduce_commitment", reasonCode: "income_over_committed", metrics: { targetReductionReais: 300 }, rankImpactReais: 300 },
      { committedPct: 70, freeBalanceReais: 150 },
    );
    expect(c.headline.toLowerCase()).toMatch(/limite|aperto|no fio/);
    expect(c.impact).toContain("R$");
  });

  it("squeezed with zero free does not render a hollow R$ 0,00 leftover", () => {
    const c = presentMove(
      { type: "reduce_commitment", reasonCode: "income_over_committed", metrics: { targetReductionReais: 200 }, rankImpactReais: 200 },
      { committedPct: 70, freeBalanceReais: 0 },
    );
    expect(c.impact).not.toMatch(/R\$\s*0,00/);
  });
});
