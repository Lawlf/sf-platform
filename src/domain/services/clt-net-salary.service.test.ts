import { describe, expect, it } from "vitest";

import { CltNetSalaryService } from "./clt-net-salary.service";

describe("CltNetSalaryService.compute", () => {
  it("computes INSS progressively (rate per bracket, not flat) for R$ 3.000", () => {
    const r = CltNetSalaryService.compute({
      grossCents: 3_000_00n,
      dependents: 0,
      otherDeductionsCents: 0n,
    });
    // 7,5%*1518 + 9%*(2793,88-1518) + 12%*(3000-2793,88) = 113,85 + 114,83 + 24,73
    expect(Number(r.inssCents) / 100).toBeCloseTo(253.41, 1);
    // desconto simplificado vence (base menor) => IRRF 7,5% * 2435,20 - 169,44 = 13,20
    expect(r.usedSimplifiedDeduction).toBe(true);
    expect(Number(r.irrfCents) / 100).toBeCloseTo(13.2, 1);
    expect(Number(r.netCents) / 100).toBeCloseTo(2733.39, 1);
  });

  it("caps INSS at the ceiling and uses legal deductions for a high salary", () => {
    const r = CltNetSalaryService.compute({
      grossCents: 10_000_00n,
      dependents: 2,
      otherDeductionsCents: 0n,
    });
    // teto INSS 2025 ~ 951,63
    expect(Number(r.inssCents) / 100).toBeCloseTo(951.63, 1);
    // deduções legais (951,63 + 2*189,59 = 1330,81) > simplificado (564,80)
    expect(r.usedSimplifiedDeduction).toBe(false);
    expect(r.irrfBandPct).toBe(27.5);
    // base 8669,19 * 0,275 - 896 = 1488,03
    expect(Number(r.irrfCents) / 100).toBeCloseTo(1488.03, 0);
    expect(Number(r.netCents) / 100).toBeCloseTo(7560.34, 0);
  });

  it("returns zero IRRF when the base falls in the exempt bracket", () => {
    const r = CltNetSalaryService.compute({
      grossCents: 1_800_00n,
      dependents: 0,
      otherDeductionsCents: 0n,
    });
    // INSS: 7,5%*1518 + 9%*(1800-1518) = 113,85 + 25,38 = 139,23
    expect(Number(r.inssCents) / 100).toBeCloseTo(139.23, 1);
    expect(r.irrfCents).toBe(0n);
    expect(r.irrfBandPct).toBe(0);
    expect(Number(r.netCents) / 100).toBeCloseTo(1660.77, 1);
  });

  it("subtracts other deductions from the net without touching the tax base", () => {
    const withOther = CltNetSalaryService.compute({
      grossCents: 3_000_00n,
      dependents: 0,
      otherDeductionsCents: 200_00n,
    });
    const without = CltNetSalaryService.compute({
      grossCents: 3_000_00n,
      dependents: 0,
      otherDeductionsCents: 0n,
    });
    expect(withOther.irrfCents).toBe(without.irrfCents);
    expect(withOther.inssCents).toBe(without.inssCents);
    expect(Number(without.netCents) - Number(withOther.netCents)).toBe(200_00);
  });

  it("dependents lower the tax when legal deductions beat the simplified discount", () => {
    const zero = CltNetSalaryService.compute({
      grossCents: 5_000_00n,
      dependents: 0,
      otherDeductionsCents: 0n,
    });
    const three = CltNetSalaryService.compute({
      grossCents: 5_000_00n,
      dependents: 3,
      otherDeductionsCents: 0n,
    });
    expect(three.irrfCents < zero.irrfCents).toBe(true);
  });
});
