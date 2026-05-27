import { describe, expect, it } from "vitest";

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
