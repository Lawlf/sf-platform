import { describe, expect, it } from "vitest";

import { SeveranceService } from "./severance.service";

describe("SeveranceService.compute", () => {
  it("computes the standard verbas for a dismissal without cause", () => {
    const r = SeveranceService.compute({
      grossSalaryCents: 3_000_00n,
      completedYears: 2,
      monthsThisYear: 6,
      daysWorkedInMonth: 15,
      fgtsBalanceCents: 0n,
      dependents: 0,
    });
    // saldo = 3000/30*15 = 1500
    expect(Number(r.saldoSalarioCents) / 100).toBeCloseTo(1500, 2);
    // aviso = 30 + 3*2 = 36 dias => 3000/30*36 = 3600
    expect(Number(r.avisoPrevioCents) / 100).toBeCloseTo(3600, 2);
    // 13º prop = 3000/12*6 = 1500
    expect(Number(r.decimoTerceiroCents) / 100).toBeCloseTo(1500, 2);
    // férias prop + 1/3 = 1500 * 4/3 = 2000
    expect(Number(r.feriasCents) / 100).toBeCloseTo(2000, 2);
    // INSS sobre saldo (112,5) + 13º (112,5) = 225; IR isento nessas faixas
    expect(Number(r.inssCents) / 100).toBeCloseTo(225, 1);
    expect(r.irrfCents).toBe(0n);
    // verbas líquidas = 8600 - 225 = 8375
    expect(Number(r.verbasLiquidasCents) / 100).toBeCloseTo(8375, 1);
    // FGTS estimado = 8% * 3000 * 30 meses = 7200; multa 40% = 2880
    expect(Number(r.fgtsBalanceCents) / 100).toBeCloseTo(7200, 1);
    expect(Number(r.fgtsFineCents) / 100).toBeCloseTo(2880, 1);
    // total = 8375 + 2880 = 11255
    expect(Number(r.totalCents) / 100).toBeCloseTo(11255, 1);
    expect(Number(r.totalWithFgtsCents) / 100).toBeCloseTo(11255 + 7200, 1);
  });

  it("caps the prior-notice at 90 days for long tenures", () => {
    const r = SeveranceService.compute({
      grossSalaryCents: 3_000_00n,
      completedYears: 25, // 30 + 75 = 105, mas teto 90
      monthsThisYear: 0,
      daysWorkedInMonth: 0,
      fgtsBalanceCents: 0n,
      dependents: 0,
    });
    // aviso = 90 dias => 3000/30*90 = 9000
    expect(Number(r.avisoPrevioCents) / 100).toBeCloseTo(9000, 2);
  });

  it("uses an informed FGTS balance when provided", () => {
    const r = SeveranceService.compute({
      grossSalaryCents: 3_000_00n,
      completedYears: 2,
      monthsThisYear: 6,
      daysWorkedInMonth: 15,
      fgtsBalanceCents: 10_000_00n,
      dependents: 0,
    });
    expect(Number(r.fgtsBalanceCents) / 100).toBeCloseTo(10000, 2);
    expect(Number(r.fgtsFineCents) / 100).toBeCloseTo(4000, 2);
  });
});
