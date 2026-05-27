import { describe, expect, it } from "vitest";

import { VacationPayService } from "./vacation-pay.service";

describe("VacationPayService.compute", () => {
  it("adds the constitutional one third and taxes the total (30 days)", () => {
    const r = VacationPayService.compute({
      grossSalaryCents: 3_000_00n,
      vacationDays: 30,
      dependents: 0,
    });
    expect(Number(r.vacationBaseCents) / 100).toBeCloseTo(3000, 2);
    expect(Number(r.oneThirdCents) / 100).toBeCloseTo(1000, 2);
    expect(Number(r.grossCents) / 100).toBeCloseTo(4000, 2);
    // INSS sobre 4000 ~ 373,41
    expect(Number(r.inssCents) / 100).toBeCloseTo(373.41, 1);
    expect(Number(r.netCents) / 100).toBeCloseTo(3492.75, 0);
  });

  it("is proportional to vacation days", () => {
    const full = VacationPayService.compute({
      grossSalaryCents: 3_000_00n,
      vacationDays: 30,
      dependents: 0,
    });
    const half = VacationPayService.compute({
      grossSalaryCents: 3_000_00n,
      vacationDays: 15,
      dependents: 0,
    });
    expect(Number(half.vacationBaseCents) / 100).toBeCloseTo(1500, 2);
    expect(half.grossCents < full.grossCents).toBe(true);
  });
});
