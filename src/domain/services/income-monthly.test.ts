import { describe, expect, it } from "vitest";

import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";
import { WEEKS_PER_MONTH } from "./monthly-frequency";

import { monthlyIncomeCents } from "./income-monthly";

const NOW = new Date("2026-05-15T10:00:00Z");

const m = (r: number) => {
  const x = Money.from(r);
  if (!isOk(x)) throw new Error("m");
  return x.value;
};

const baseIncome: IncomeEntity = {
  id: "i1",
  userId: "u1",
  profileId: "p1",
  label: "Salário",
  amount: m(1000),
  frequency: "monthly",
  startDate: NOW,
  endDate: null,
  isActive: true,
  paymentDay: null,
  isEstimated: false,
  sourceBreakdown: null,
  createdAt: NOW,
  deletedAt: null,
};

const TARGET = { year: 2026, month: 4 }; // May 2026 (0-based)

describe("monthlyIncomeCents", () => {
  it("monthly income returns amount in cents", () => {
    const inc: IncomeEntity = { ...baseIncome, frequency: "monthly", amount: m(1000) };
    const cents = monthlyIncomeCents(inc, TARGET, []);
    expect(cents).toBe(100000n);
  });

  it("weekly income uses the canonical monthly equivalent", () => {
    const inc: IncomeEntity = {
      ...baseIncome,
      frequency: "weekly",
      amount: m(1000),
    };
    const cents = monthlyIncomeCents(inc, TARGET, []);
    expect(Number(cents)).toBe(Math.round(1000 * WEEKS_PER_MONTH * 100));
  });

  it("one_off income in target month returns amount", () => {
    const inc: IncomeEntity = {
      ...baseIncome,
      frequency: "one_off",
      startDate: new Date("2026-05-10T00:00:00Z"),
      amount: m(2000),
    };
    const cents = monthlyIncomeCents(inc, TARGET, []);
    expect(cents).toBe(200000n);
  });

  it("one_off income outside target month returns 0", () => {
    const inc: IncomeEntity = {
      ...baseIncome,
      frequency: "one_off",
      startDate: new Date("2026-04-10T00:00:00Z"),
      amount: m(2000),
    };
    const cents = monthlyIncomeCents(inc, TARGET, []);
    expect(cents).toBe(0n);
  });

  it("monthly income before its start month returns 0 (future income not counted)", () => {
    const inc: IncomeEntity = {
      ...baseIncome,
      frequency: "monthly",
      amount: m(2479.66),
      startDate: new Date("2026-07-01T00:00:00Z"), // starts after TARGET (May)
    };
    expect(monthlyIncomeCents(inc, TARGET, [])).toBe(0n);
  });

  it("monthly income after its end month returns 0 (ended income not counted)", () => {
    const inc: IncomeEntity = {
      ...baseIncome,
      frequency: "monthly",
      amount: m(2479.66),
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-04-30T00:00:00Z"), // ended before TARGET (May)
    };
    expect(monthlyIncomeCents(inc, TARGET, [])).toBe(0n);
  });

  it("monthly income active in the target month still counts (boundary)", () => {
    const inc: IncomeEntity = {
      ...baseIncome,
      frequency: "monthly",
      amount: m(1000),
      startDate: new Date("2026-05-31T00:00:00Z"), // starts within TARGET month
      endDate: new Date("2026-05-01T00:00:00Z"), // ends within TARGET month
    };
    expect(monthlyIncomeCents(inc, TARGET, [])).toBe(100000n);
  });

  it("applies not_received settlement to zero", () => {
    const inc: IncomeEntity = { ...baseIncome, frequency: "monthly", amount: m(5000) };
    const settlement: IncomeSettlementEntity = {
      id: "s1",
      profileId: "p1",
      incomeId: "i1",
      month: new Date(Date.UTC(2026, 4, 1)),
      status: "not_received",
      adjustedAmountCents: null,
      createdAt: NOW,
    } as unknown as IncomeSettlementEntity;
    const cents = monthlyIncomeCents(inc, TARGET, [settlement]);
    expect(cents).toBe(0n);
  });

  it("applies adjusted settlement override", () => {
    const inc: IncomeEntity = { ...baseIncome, frequency: "monthly", amount: m(5000) };
    const settlement: IncomeSettlementEntity = {
      id: "s1",
      profileId: "p1",
      incomeId: "i1",
      month: new Date(Date.UTC(2026, 4, 1)),
      status: "adjusted",
      adjustedAmountCents: 300000n,
      createdAt: NOW,
    } as unknown as IncomeSettlementEntity;
    const cents = monthlyIncomeCents(inc, TARGET, [settlement]);
    expect(cents).toBe(300000n);
  });

  it("weekly income with not_received settlement returns 0", () => {
    const inc: IncomeEntity = {
      ...baseIncome,
      frequency: "weekly",
      amount: m(1000),
    };
    const settlement: IncomeSettlementEntity = {
      id: "s1",
      profileId: "p1",
      incomeId: "i1",
      month: new Date(Date.UTC(2026, 4, 1)),
      status: "not_received",
      adjustedAmountCents: null,
      createdAt: NOW,
    } as unknown as IncomeSettlementEntity;
    const cents = monthlyIncomeCents(inc, TARGET, [settlement]);
    expect(cents).toBe(0n);
  });
});
