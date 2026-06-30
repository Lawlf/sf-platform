import { describe, expect, it } from "vitest";

import type { FinancingDebt } from "@/domain/entities/debt.entity";
import type { InstallmentDueDate } from "@/domain/services/debt-calendar.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { buildGoogleCalendarUrl } from "./google-calendar-link";

function money(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("money");
  return r.value;
}

function rate(n: number): InterestRate {
  const r = InterestRate.fromAnnual(n);
  if (!isOk(r)) throw new Error("rate");
  return r.value;
}

function makeFinancing(): FinancingDebt {
  return {
    id: "abc-123",
    userId: "u1",
    profileId: "profile-1",
    label: "Financiamento apto",
    kind: "financing",
    status: "active",
    originalPrincipal: money(100_000),
    currentBalance: money(100_000),
    startDate: new Date(Date.UTC(2026, 0, 15)),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    amortizationMethod: "PRICE",
    annualInterestRate: rate(0.1),
    termMonths: 60,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    monthlyInstallment: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeRow(month: number, total: number, dueDate: Date, amountCents: bigint): InstallmentDueDate {
  return {
    month,
    dueDate,
    amount: Money.fromCents(amountCents),
    description: `Parcela ${month}/${total}`,
    total,
  };
}

describe("buildGoogleCalendarUrl", () => {
  it("returns null when there are no due dates", () => {
    expect(
      buildGoogleCalendarUrl({
        debt: makeFinancing(),
        dueDates: [],
        appUrl: "https://app.example.com",
      }),
    ).toBeNull();
  });

  it("builds a TEMPLATE url anchored on the first due date", () => {
    const url = buildGoogleCalendarUrl({
      debt: makeFinancing(),
      dueDates: [
        makeRow(1, 3, new Date(Date.UTC(2026, 0, 15)), 145000n),
        makeRow(2, 3, new Date(Date.UTC(2026, 1, 15)), 145000n),
        makeRow(3, 3, new Date(Date.UTC(2026, 2, 15)), 145000n),
      ],
      appUrl: "https://app.example.com",
    });

    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Parcela: Financiamento apto");
    // all-day: first due date, end exclusive next day
    expect(parsed.searchParams.get("dates")).toBe("20260115/20260116");
  });

  it("uses a monthly RRULE covering every installment", () => {
    const url = buildGoogleCalendarUrl({
      debt: makeFinancing(),
      dueDates: [
        makeRow(1, 2, new Date(Date.UTC(2026, 0, 15)), 145000n),
        makeRow(2, 2, new Date(Date.UTC(2026, 1, 15)), 145000n),
      ],
      appUrl: "https://app.example.com",
    });

    const parsed = new URL(url!);
    expect(parsed.searchParams.get("recur")).toBe("RRULE:FREQ=MONTHLY;COUNT=2");
  });

  it("omits recur when there is a single installment", () => {
    const url = buildGoogleCalendarUrl({
      debt: makeFinancing(),
      dueDates: [makeRow(1, 1, new Date(Date.UTC(2026, 0, 15)), 145000n)],
      appUrl: "https://app.example.com",
    });

    const parsed = new URL(url!);
    expect(parsed.searchParams.get("recur")).toBeNull();
  });

  it("includes the reference amount and a normalized debt link in details", () => {
    const url = buildGoogleCalendarUrl({
      debt: makeFinancing(),
      dueDates: [makeRow(1, 1, new Date(Date.UTC(2026, 0, 15)), 145000n)],
      appUrl: "https://app.example.com/", // trailing slash must be stripped
    });

    const details = new URL(url!).searchParams.get("details")!;
    expect(details).toContain("Valor de referência:");
    expect(details).toContain("https://app.example.com/app/dividas/abc-123");
    expect(details).not.toContain("https://app.example.com//app/dividas");
  });
});
