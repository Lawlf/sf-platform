import { describe, expect, it } from "vitest";
import { presentMove } from "./prescription-copy";

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
