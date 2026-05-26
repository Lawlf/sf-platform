import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { AmortizationSchedule, type AmortizationInstallment } from "./amortization-schedule.vo";
import { Money } from "./money.vo";

function row(
  month: number,
  installment: number,
  principal: number,
  interest: number,
  remainingBalance: number,
): AmortizationInstallment {
  const m = (n: number): Money => {
    const r = Money.from(n);
    if (!isOk(r)) throw new Error("fixture money parse failed");
    return r.value;
  };
  return {
    month,
    installment: m(installment),
    principal: m(principal),
    interest: m(interest),
    remainingBalance: m(remainingBalance),
  };
}

const originalPrincipal = (n: number): Money => {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture money parse failed");
  return r.value;
};

describe("AmortizationSchedule", () => {
  it("valid 12-month schedule passes all invariants", () => {
    const installments: AmortizationInstallment[] = [];
    let balance = 1200;
    const amortPerMonth = 100;
    const interestPerMonth = 5;
    const installmentTotal = amortPerMonth + interestPerMonth;
    for (let m = 1; m <= 12; m++) {
      balance -= amortPerMonth;
      installments.push(row(m, installmentTotal, amortPerMonth, interestPerMonth, balance));
    }
    const r = AmortizationSchedule.from({
      installments,
      originalPrincipal: originalPrincipal(1200),
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.termMonths()).toBe(12);
      expect(r.value.totalPrincipal().toCents()).toBe(120000n);
      expect(r.value.totalPaid().toCents()).toBe(126000n);
      expect(r.value.totalInterest().toCents()).toBe(6000n);
    }
  });

  it("rejects empty installments", () => {
    expect(
      isErr(
        AmortizationSchedule.from({ installments: [], originalPrincipal: originalPrincipal(1000) }),
      ),
    ).toBe(true);
  });

  it("rejects month gap (1, 2, 4)", () => {
    const installments: AmortizationInstallment[] = [
      row(1, 100, 90, 10, 910),
      row(2, 100, 90, 10, 820),
      row(4, 100, 820, 10, 0),
    ];
    expect(
      isErr(
        AmortizationSchedule.from({ installments, originalPrincipal: originalPrincipal(1000) }),
      ),
    ).toBe(true);
  });

  it("rejects negative principal portion", () => {
    const installments: AmortizationInstallment[] = [row(1, 100, -10, 110, 1010)];
    expect(
      isErr(
        AmortizationSchedule.from({ installments, originalPrincipal: originalPrincipal(1000) }),
      ),
    ).toBe(true);
  });

  it("rejects installment != principal + interest", () => {
    const installments: AmortizationInstallment[] = [row(1, 100, 50, 30, 950)];
    expect(
      isErr(
        AmortizationSchedule.from({ installments, originalPrincipal: originalPrincipal(1000) }),
      ),
    ).toBe(true);
  });

  it("rejects when sum of principal != originalPrincipal", () => {
    const installments: AmortizationInstallment[] = [
      row(1, 100, 50, 50, 50),
      row(2, 100, 50, 50, 0),
    ];
    // total principal = 100, but originalPrincipal claimed 500
    expect(
      isErr(AmortizationSchedule.from({ installments, originalPrincipal: originalPrincipal(500) })),
    ).toBe(true);
  });

  it("rejects when final balance is not zero", () => {
    const installments: AmortizationInstallment[] = [
      row(1, 100, 50, 50, 50), // ends at 50, not 0
    ];
    expect(
      isErr(AmortizationSchedule.from({ installments, originalPrincipal: originalPrincipal(50) })),
    ).toBe(true);
  });

  it("installmentAt returns row by month and null otherwise", () => {
    const installments: AmortizationInstallment[] = [
      row(1, 100, 50, 50, 50),
      row(2, 100, 50, 50, 0),
    ];
    const r = AmortizationSchedule.from({
      installments,
      originalPrincipal: originalPrincipal(100),
    });
    if (isOk(r)) {
      expect(r.value.installmentAt(1)?.installment.toCents()).toBe(10000n);
      expect(r.value.installmentAt(2)?.month).toBe(2);
      expect(r.value.installmentAt(99)).toBeNull();
      expect(r.value.installmentAt(0)).toBeNull();
    }
  });

  it("tolerates +/- 1 cent rounding on principal sum and final balance", () => {
    // principal sum = 999 cents, originalPrincipal = 1000 cents -> 1 cent diff allowed
    const installments: AmortizationInstallment[] = [
      row(1, 5.04, 4.99, 0.05, 5.01),
      row(2, 5.04, 5.0, 0.04, 0.01),
    ];
    // installment[1].installment = 5.04 = 4.99 + 0.05 (ok within 1 cent tolerance)
    // installment[2].installment = 5.04 = 5.00 + 0.04 ok
    // sum(principal) = 999 cents, originalPrincipal = 1000 cents -> 1 cent off (allowed)
    // final remainingBalance = 1 cent (allowed)
    const r = AmortizationSchedule.from({
      installments,
      originalPrincipal: originalPrincipal(10),
    });
    expect(isOk(r)).toBe(true);
  });
});
