import { describe, expect, it } from "vitest";

import { CltNetSalaryService } from "./clt-net-salary.service";

describe("CltNetSalaryService.compute", () => {
  it("computes INSS progressively (rate per bracket, not flat) for R$ 3.000", () => {
    const r = CltNetSalaryService.compute({
      grossCents: 3_000_00n,
      dependents: 0,
      otherDeductionsCents: 0n,
    });
    // 7,5%*1621 + 9%*(2902,84-1621) + 12%*(3000-2902,84) = 121,58 + 115,37 + 11,66
    expect(Number(r.inssCents) / 100).toBeCloseTo(248.6, 1);
    // base = 3000 - 607,20 (simplificado) = 2392,80, dentro da faixa isenta; o
    // redutor da Lei 15.270/2025 zera qualquer imposto até R$ 5.000 mensais.
    expect(r.usedSimplifiedDeduction).toBe(true);
    expect(r.irrfCents).toBe(0n);
    expect(r.irrfBandPct).toBe(0);
    expect(Number(r.netCents) / 100).toBeCloseTo(2751.4, 1);
  });

  it("caps INSS at the ceiling and uses legal deductions for a high salary", () => {
    const r = CltNetSalaryService.compute({
      grossCents: 10_000_00n,
      dependents: 2,
      otherDeductionsCents: 0n,
    });
    // teto INSS 2026 ~ 988,09
    expect(Number(r.inssCents) / 100).toBeCloseTo(988.09, 1);
    // deduções legais (988,09 + 2*189,59 = 1367,27) > simplificado (607,20)
    expect(r.usedSimplifiedDeduction).toBe(false);
    expect(r.irrfBandPct).toBe(27.5);
    // base 8632,73 * 0,275 - 908,73 = 1465,27 (acima de 7.350, sem redutor)
    expect(Number(r.irrfCents) / 100).toBeCloseTo(1465.27, 0);
    expect(Number(r.netCents) / 100).toBeCloseTo(7546.64, 0);
  });

  it("returns zero IRRF when the base falls in the exempt bracket", () => {
    const r = CltNetSalaryService.compute({
      grossCents: 1_800_00n,
      dependents: 0,
      otherDeductionsCents: 0n,
    });
    // INSS: 7,5%*1621 + 9%*(1800-1621) = 121,58 + 16,11 = 137,69
    expect(Number(r.inssCents) / 100).toBeCloseTo(137.69, 1);
    expect(r.irrfCents).toBe(0n);
    expect(r.irrfBandPct).toBe(0);
    expect(Number(r.netCents) / 100).toBeCloseTo(1662.32, 1);
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
      grossCents: 8_000_00n,
      dependents: 0,
      otherDeductionsCents: 0n,
    });
    const three = CltNetSalaryService.compute({
      grossCents: 8_000_00n,
      dependents: 3,
      otherDeductionsCents: 0n,
    });
    expect(three.irrfCents < zero.irrfCents).toBe(true);
  });
});
