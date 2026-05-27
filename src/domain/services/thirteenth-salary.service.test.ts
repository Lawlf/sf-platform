import { describe, expect, it } from "vitest";

import { ThirteenthSalaryService } from "./thirteenth-salary.service";

describe("ThirteenthSalaryService.compute", () => {
  it("taxes the full 13th and splits it into two installments", () => {
    const r = ThirteenthSalaryService.compute({
      grossSalaryCents: 3_000_00n,
      monthsWorked: 12,
      dependents: 0,
    });
    expect(Number(r.gross13Cents) / 100).toBeCloseTo(3000, 2);
    expect(Number(r.inssCents) / 100).toBeCloseTo(253.41, 1);
    expect(Number(r.irrfCents) / 100).toBeCloseTo(13.2, 1);
    expect(Number(r.netCents) / 100).toBeCloseTo(2733.39, 1);
    expect(Number(r.firstInstallmentCents) / 100).toBeCloseTo(1500, 2);
    // 2ª parcela = líquido - 1ª
    expect(r.secondInstallmentCents).toBe(r.netCents - r.firstInstallmentCents);
  });

  it("is proportional to months worked", () => {
    const r = ThirteenthSalaryService.compute({
      grossSalaryCents: 3_000_00n,
      monthsWorked: 6,
      dependents: 0,
    });
    expect(Number(r.gross13Cents) / 100).toBeCloseTo(1500, 2);
    // INSS 7,5% * 1500 = 112,50; base isenta de IR
    expect(Number(r.inssCents) / 100).toBeCloseTo(112.5, 1);
    expect(r.irrfCents).toBe(0n);
    expect(Number(r.netCents) / 100).toBeCloseTo(1387.5, 1);
  });
});
