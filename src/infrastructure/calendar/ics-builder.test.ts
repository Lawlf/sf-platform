import { describe, expect, it } from "vitest";

import type { FinancingDebt } from "@/domain/entities/debt.entity";
import type { InstallmentDueDate } from "@/domain/services/debt-calendar.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import {
  buildDebtIcs,
  escapeIcsText,
  foldLine,
  formatIcsDate,
  isAlarmOffset,
  slugifyDebtLabel,
} from "./ics-builder";

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

describe("escapeIcsText", () => {
  it("escapes backslash, semicolon, comma, newlines", () => {
    expect(escapeIcsText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });

  it("handles CRLF", () => {
    expect(escapeIcsText("line1\r\nline2")).toBe("line1\\nline2");
  });
});

describe("formatIcsDate", () => {
  it("formats UTC date as YYYYMMDD", () => {
    expect(formatIcsDate(new Date(Date.UTC(2026, 0, 15)))).toBe("20260115");
    expect(formatIcsDate(new Date(Date.UTC(2030, 11, 1)))).toBe("20301201");
  });
});

describe("foldLine", () => {
  it("does not fold lines shorter than 75 octets", () => {
    const line = "X".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds long ASCII lines", () => {
    const line = "X".repeat(150);
    const folded = foldLine(line);
    expect(folded).toContain("\r\n ");
    for (const part of folded.split("\r\n")) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
  });

  it("does not split multi-byte chars", () => {
    const line = "DESCRIPTION:" + "ç".repeat(50);
    const folded = foldLine(line);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});

describe("isAlarmOffset", () => {
  it("accepts valid", () => {
    expect(isAlarmOffset("none")).toBe(true);
    expect(isAlarmOffset("1d")).toBe(true);
    expect(isAlarmOffset("7d")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(isAlarmOffset("bogus")).toBe(false);
    expect(isAlarmOffset(undefined)).toBe(false);
  });
});

describe("slugifyDebtLabel", () => {
  it("removes accents and lowercases", () => {
    expect(slugifyDebtLabel("Cartão Itaú")).toBe("cartao-itau");
  });
  it("collapses separators", () => {
    expect(slugifyDebtLabel("Apto - 2º andar; rua x")).toBe("apto-2-andar-rua-x");
  });
  it("falls back to divida when empty", () => {
    expect(slugifyDebtLabel("***")).toBe("divida");
    expect(slugifyDebtLabel("")).toBe("divida");
  });
});

describe("buildDebtIcs", () => {
  it("produces a valid VCALENDAR with one event per row", () => {
    const debt = makeFinancing();
    const rows = [
      makeRow(1, 2, new Date(Date.UTC(2026, 0, 15)), 145000n),
      makeRow(2, 2, new Date(Date.UTC(2026, 1, 15)), 145000n),
    ];

    const ics = buildDebtIcs({
      debt,
      dueDates: rows,
      alarmOffset: "1d",
      appUrl: "https://app.example.com",
      now: new Date(Date.UTC(2026, 0, 1, 12, 30, 0)),
    });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("PRODID:-//Sabor Financeiro//Dividas//PT-BR");
    expect(ics).toMatch(/BEGIN:VEVENT[\s\S]+?END:VEVENT[\s\S]+BEGIN:VEVENT[\s\S]+?END:VEVENT/);
    expect(ics).toContain("UID:divida-abc-123-parcela-1@saborfinanceiro.com.br");
    expect(ics).toContain("UID:divida-abc-123-parcela-2@saborfinanceiro.com.br");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260115");
    expect(ics).toContain("DTEND;VALUE=DATE:20260116");
    expect(ics).toContain("DTSTAMP:20260101T123000Z");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-P1D");
  });

  it("omits VALARM when alarmOffset is none", () => {
    const debt = makeFinancing();
    const ics = buildDebtIcs({
      debt,
      dueDates: [makeRow(1, 1, new Date(Date.UTC(2026, 0, 15)), 100000n)],
      alarmOffset: "none",
      appUrl: "https://app.example.com",
      now: new Date(Date.UTC(2026, 0, 1)),
    });

    expect(ics).not.toContain("BEGIN:VALARM");
    expect(ics).not.toContain("TRIGGER:");
  });

  it("escapes special chars in label", () => {
    const debt: FinancingDebt = { ...makeFinancing(), label: "Apto, 2º; rua x" };
    const ics = buildDebtIcs({
      debt,
      dueDates: [makeRow(1, 1, new Date(Date.UTC(2026, 0, 15)), 100000n)],
      alarmOffset: "none",
      appUrl: "https://app.example.com",
      now: new Date(Date.UTC(2026, 0, 1)),
    });

    expect(ics).toContain("Apto\\, 2º\\; rua x");
  });

  it("uses different trigger for 7d", () => {
    const debt = makeFinancing();
    const ics = buildDebtIcs({
      debt,
      dueDates: [makeRow(1, 1, new Date(Date.UTC(2026, 0, 15)), 100000n)],
      alarmOffset: "7d",
      appUrl: "https://app.example.com",
      now: new Date(Date.UTC(2026, 0, 1)),
    });

    expect(ics).toContain("TRIGGER:-P7D");
  });
});
