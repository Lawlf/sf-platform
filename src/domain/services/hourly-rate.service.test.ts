import { describe, expect, it } from "vitest";

import type { IncomeSourceBreakdown } from "@/domain/entities/income.entity";

import { HourlyRateService } from "./hourly-rate.service";

describe("HourlyRateService.compute", () => {
  it("computes the hourly value from monthly income and weekly hours", () => {
    const r = HourlyRateService.compute({ netMonthlyCents: 4_400_00n, hoursPerWeek: 40 });
    // 40 x (52/12) = 173,33 h/mês; 4.400 / 173,33 = ~25,38/h
    expect(r.monthlyHours).toBeCloseTo(173.33, 1);
    expect(Number(r.hourlyCents) / 100).toBeCloseTo(25.38, 1);
    // por dia útil: 4.400 / 22 = 200
    expect(Number(r.perWorkdayCents) / 100).toBeCloseTo(200, 2);
  });

  it("fewer hours for the same income raises the hourly value", () => {
    const full = HourlyRateService.compute({ netMonthlyCents: 5_000_00n, hoursPerWeek: 40 });
    const part = HourlyRateService.compute({ netMonthlyCents: 5_000_00n, hoursPerWeek: 20 });
    expect(part.hourlyCents > full.hourlyCents).toBe(true);
  });

  it("returns zero hourly when no hours are worked", () => {
    const r = HourlyRateService.compute({ netMonthlyCents: 5_000_00n, hoursPerWeek: 0 });
    expect(r.hourlyCents).toBe(0n);
  });
});

describe("HourlyRateService.project", () => {
  it("soma diárias de um único tipo", () => {
    const b: IncomeSourceBreakdown = {
      basis: "daily",
      lines: [{ count: 8, valuePerShiftCents: 60000 }],
    };
    expect(HourlyRateService.project(b).monthCents).toBe(480000n);
  });

  it("soma múltiplos tipos de diária (normal + fim de semana)", () => {
    const b: IncomeSourceBreakdown = {
      basis: "daily",
      lines: [
        { count: 8, valuePerShiftCents: 60000 },
        { count: 2, valuePerShiftCents: 90000 },
      ],
    };
    expect(HourlyRateService.project(b).monthCents).toBe(660000n);
  });

  it("deriva valor por hora combinado quando a duração é informada", () => {
    const b: IncomeSourceBreakdown = {
      basis: "daily",
      lines: [{ count: 8, valuePerShiftCents: 60000, hoursPerShift: 12 }],
    };
    expect(HourlyRateService.project(b).hourlyCents).toBe(5000n);
  });

  it("retorna hourlyCents null quando nenhuma diária tem duração", () => {
    const b: IncomeSourceBreakdown = {
      basis: "daily",
      lines: [{ count: 8, valuePerShiftCents: 60000 }],
    };
    expect(HourlyRateService.project(b).hourlyCents).toBeNull();
  });

  it("projeta o mês a partir de valor/hora e horas/semana", () => {
    const b: IncomeSourceBreakdown = { basis: "hourly", hourlyCents: 5000, hoursPerWeek: 40 };
    const r = HourlyRateService.project(b);
    expect(r.hourlyCents).toBe(5000n);
    expect(r.monthCents).toBe(866667n);
  });

  it("trata valores inválidos como zero", () => {
    const b: IncomeSourceBreakdown = {
      basis: "daily",
      lines: [{ count: -3, valuePerShiftCents: 60000 }],
    };
    expect(HourlyRateService.project(b).monthCents).toBe(0n);
  });
});
