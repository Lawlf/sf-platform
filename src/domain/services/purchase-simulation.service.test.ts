import { describe, expect, it } from "vitest";

import { PurchaseSimulationService } from "./purchase-simulation.service";

describe("PurchaseSimulationService.simulate", () => {
  it("computes scenarios for 12 months, 25% depreciation, 12% CDI", () => {
    const r = PurchaseSimulationService.simulate({
      amountCents: 100_00000n, // R$ 100.000,00
      monthsHorizon: 12,
      depreciationRatePctYear: 25,
      opportunityRatePctYear: 12,
    });

    // Keep: 100k * (1 - 0.25 * 1) = 75k
    expect(Number(r.scenarioKeep.finalValueCents)).toBeCloseTo(75_00000, -2);
    // NetLoss = 100k - 75k = 25k
    expect(Number(r.scenarioKeep.netLossCents)).toBeCloseTo(25_00000, -2);

    // Resell = keep
    expect(r.scenarioResell.finalValueCents).toBe(r.scenarioKeep.finalValueCents);

    // Invest: 100k * 1.12 = 112k
    expect(Number(r.scenarioInvest.finalValueCents)).toBeCloseTo(112_00000, -2);
    expect(Number(r.scenarioInvest.profitCents)).toBeCloseTo(12_00000, -2);

    // Opportunity cost: 112k - 75k = 37k
    expect(Number(r.opportunityCostCents)).toBeCloseTo(37_00000, -2);
  });

  it("handles 24 month horizon with 30% depreciation and 12% CDI", () => {
    const r = PurchaseSimulationService.simulate({
      amountCents: 80_00000n,
      monthsHorizon: 24,
      depreciationRatePctYear: 30,
      opportunityRatePctYear: 12,
    });
    // years = 2
    // Keep: 80 * (1 - 0.30 * 2) = 80 * 0.40 = 32
    expect(Number(r.scenarioKeep.finalValueCents)).toBeCloseTo(32_00000, -2);
    // Invest: 80 * 1.12^2 = 80 * 1.2544 = ~100.352
    expect(Number(r.scenarioInvest.finalValueCents)).toBeCloseTo(100_35200, -3);
  });

  it("clamps keep value to zero when depreciation exceeds 100%", () => {
    const r = PurchaseSimulationService.simulate({
      amountCents: 100_00000n,
      monthsHorizon: 60, // 5 years
      depreciationRatePctYear: 30, // 5 * 30% = 150% > 100
      opportunityRatePctYear: 12,
    });
    expect(r.scenarioKeep.finalValueCents).toBe(0n);
    expect(r.scenarioKeep.netLossCents).toBe(100_00000n);
  });

  it("handles appreciating asset (negative rate)", () => {
    const r = PurchaseSimulationService.simulate({
      amountCents: 100_00000n,
      monthsHorizon: 12,
      depreciationRatePctYear: -5, // appreciates 5%/year
      opportunityRatePctYear: 12,
    });
    // Keep: 100 * (1 - (-0.05) * 1) = 100 * 1.05 = 105
    expect(Number(r.scenarioKeep.finalValueCents)).toBeCloseTo(105_00000, -2);
    // Loss = -5 (gain of 5)
    expect(Number(r.scenarioKeep.netLossCents)).toBeCloseTo(-5_00000, -2);
  });

  it("opportunity cost is correct when keep > invest (rare, e.g. appreciating asset beats CDI)", () => {
    const r = PurchaseSimulationService.simulate({
      amountCents: 100_00000n,
      monthsHorizon: 12,
      depreciationRatePctYear: -20, // appreciates 20%/year
      opportunityRatePctYear: 12,
    });
    // Keep: 100 * 1.20 = 120
    // Invest: 100 * 1.12 = 112
    // Opportunity cost = 112 - 120 = -8 (perderia se investisse)
    expect(Number(r.opportunityCostCents)).toBeCloseTo(-8_00000, -2);
  });

  it("returns zero scenarios when amount is zero", () => {
    const r = PurchaseSimulationService.simulate({
      amountCents: 0n,
      monthsHorizon: 12,
      depreciationRatePctYear: 25,
      opportunityRatePctYear: 12,
    });
    expect(r.scenarioKeep.finalValueCents).toBe(0n);
    expect(r.scenarioInvest.finalValueCents).toBe(0n);
    expect(r.opportunityCostCents).toBe(0n);
  });

  it("handles short horizon (1 month) correctly", () => {
    const r = PurchaseSimulationService.simulate({
      amountCents: 100_00000n,
      monthsHorizon: 1,
      depreciationRatePctYear: 25,
      opportunityRatePctYear: 12,
    });
    // years = 1/12
    // Keep: 100k * (1 - 0.25/12) ~= 100k * 0.97917 = ~97.917
    expect(Number(r.scenarioKeep.finalValueCents)).toBeCloseTo(97_91667, -3);
    // Invest: 100k * 1.12^(1/12) ~= 100k * 1.00949 = ~100.949
    expect(Number(r.scenarioInvest.finalValueCents)).toBeCloseTo(100_94878, -3);
  });
});
