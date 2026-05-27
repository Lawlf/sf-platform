import { describe, expect, it } from "vitest";

import { SavingsComparisonService } from "./savings-comparison.service";

describe("SavingsComparisonService.compare", () => {
  it("computes net yields and picks the CDB at 100% CDI over 12 months", () => {
    const r = SavingsComparisonService.compare({
      amountCents: 10_000_00n,
      months: 12,
      cdiAnnualPct: 10,
      cdbPctCdi: 100,
    });
    // Poupança: 0,5%/mês composto ~ 6,17% isento
    expect(Number(r.poupanca.netYieldCents) / 100).toBeCloseTo(616.78, 0);
    expect(r.poupanca.taxCents).toBe(0n);
    // CDB 100% CDI 10% a.a. => 1.000 bruto, IR 20% (360 dias) => 800 líquido
    expect(Number(r.cdb.grossYieldCents) / 100).toBeCloseTo(1000, 0);
    expect(Number(r.cdb.netYieldCents) / 100).toBeCloseTo(800, 0);
    // Tesouro: 1.000 bruto, IR 200 + custódia 20 => 780 líquido
    expect(Number(r.tesouro.netYieldCents) / 100).toBeCloseTo(780, 0);
    expect(r.best).toBe("cdb");
  });

  it("applies the 22,5% IR band for short terms (<= 180 days)", () => {
    const r = SavingsComparisonService.compare({
      amountCents: 10_000_00n,
      months: 6,
      cdiAnnualPct: 12,
      cdbPctCdi: 100,
    });
    // IR de 22,5% sobre o rendimento do CDB
    const gross = Number(r.cdb.grossYieldCents);
    const tax = Number(r.cdb.taxCents);
    expect(tax / gross).toBeCloseTo(0.225, 3);
  });

  it("a higher CDB %CDI eventually beats the poupança", () => {
    const r = SavingsComparisonService.compare({
      amountCents: 10_000_00n,
      months: 24,
      cdiAnnualPct: 11,
      cdbPctCdi: 110,
    });
    expect(r.cdb.netYieldCents > r.poupanca.netYieldCents).toBe(true);
  });
});
