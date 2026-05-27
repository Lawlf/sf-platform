import { describe, expect, it } from "vitest";

import { EmergencyFundService } from "./emergency-fund.service";

describe("EmergencyFundService.simulate", () => {
  it("computes target, coverage and gap for a partial reserve", () => {
    const r = EmergencyFundService.simulate({
      monthlyCostCents: 3_000_00n,
      currentReserveCents: 9_000_00n,
      targetMonths: 6,
      monthlyContributionCents: 1_500_00n,
    });
    expect(Number(r.targetCents)).toBe(18_000_00);
    expect(r.monthsCovered).toBeCloseTo(3, 5);
    expect(Number(r.gapCents)).toBe(9_000_00);
    expect(r.status).toBe("parcial");
    expect(r.monthsToComplete).toBe(6); // 9.000 / 1.500
  });

  it("flags zerada when there is no reserve", () => {
    const r = EmergencyFundService.simulate({
      monthlyCostCents: 2_000_00n,
      currentReserveCents: 0n,
      targetMonths: 6,
      monthlyContributionCents: 500_00n,
    });
    expect(r.status).toBe("zerada");
    expect(r.monthsCovered).toBe(0);
  });

  it("flags ok and zero gap when the reserve reaches the target", () => {
    const r = EmergencyFundService.simulate({
      monthlyCostCents: 2_000_00n,
      currentReserveCents: 12_000_00n,
      targetMonths: 6,
      monthlyContributionCents: 500_00n,
    });
    expect(r.status).toBe("ok");
    expect(r.gapCents).toBe(0n);
    expect(r.monthsToComplete).toBe(0);
  });

  it("returns null monthsToComplete when there is a gap but no contribution", () => {
    const r = EmergencyFundService.simulate({
      monthlyCostCents: 2_000_00n,
      currentReserveCents: 1_000_00n,
      targetMonths: 6,
      monthlyContributionCents: 0n,
    });
    expect(r.monthsToComplete).toBeNull();
    expect(r.status).toBe("parcial");
  });

  it("reports fractional months of coverage", () => {
    const r = EmergencyFundService.simulate({
      monthlyCostCents: 2_000_00n,
      currentReserveCents: 5_000_00n,
      targetMonths: 6,
      monthlyContributionCents: 0n,
    });
    expect(r.monthsCovered).toBeCloseTo(2.5, 5);
  });
});
