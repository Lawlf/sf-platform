import { describe, expect, it } from "vitest";

import { PRESCRIPTION_CONFIG } from "@/domain/config/prescription-config";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { PrescriptionEngine } from "./prescription-engine.service";
import type { PrescriptionSnapshot } from "./prescription.types";

const NOW = new Date("2026-05-25T00:00:00Z");

function money(reais: number): Money {
  const r = Money.from(reais);
  if (!isOk(r)) throw new Error("bad money");
  return r.value;
}
function monthlyRate(dec: number): InterestRate {
  const r = InterestRate.fromMonthly(dec);
  if (!isOk(r)) throw new Error("bad rate");
  return r.value;
}
function creditCard(opts: {
  id?: string; label?: string; balanceReais: number; statementReais?: number;
  revolvingMonthly: number | null;
}): DebtEntity {
  return {
    id: opts.id ?? "cc1", userId: "u1", label: opts.label ?? "Cartão", kind: "credit_card",
    status: "active", currentBalance: money(opts.balanceReais), originalPrincipal: money(opts.balanceReais),
    creditLimit: money(opts.balanceReais * 2), statementDay: 1, dueDay: 10,
    currentStatement: money(opts.statementReais ?? 0), revolvingBalance: money(opts.balanceReais),
    revolvingMonthlyRate: opts.revolvingMonthly === null ? null : monthlyRate(opts.revolvingMonthly),
    installmentPurchases: [], createdAt: NOW, deletedAt: null,
  } as unknown as DebtEntity;
}
function personalLoan(opts: { id?: string; label?: string; balanceReais: number; annualRate: number; termMonths: number; installmentReais: number }): DebtEntity {
  const ann = InterestRate.fromAnnual(opts.annualRate);
  if (!isOk(ann)) throw new Error("bad rate");
  return {
    id: opts.id ?? "pl1", userId: "u1", label: opts.label ?? "Empréstimo", kind: "personal_loan",
    status: "active", currentBalance: money(opts.balanceReais), originalPrincipal: money(opts.balanceReais),
    annualInterestRate: ann.value, termMonths: opts.termMonths, monthlyInstallment: money(opts.installmentReais),
    createdAt: NOW, deletedAt: null,
  } as unknown as DebtEntity;
}
function baseSnapshot(over: Partial<PrescriptionSnapshot>): PrescriptionSnapshot {
  return {
    now: NOW, debts: [], monthlyIncomeReais: 5000, monthlyEssentialReais: 2000,
    freeBalanceReais: 1000, committedPct: 30, reserveReais: 10000, hasEstimatedIncome: false, config: PRESCRIPTION_CONFIG, ...over,
  };
}

describe("PrescriptionEngine — completeness gate", () => {
  it("is incomplete with no income and no debts", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({ monthlyIncomeReais: 0, debts: [] }));
    expect(out.state).toBe("incomplete");
    expect(out.dominant).toBeNull();
    expect(out.completeness.complete).toBe(false);
    expect(out.completeness.missing).toContain("income");
  });
  it("prescribes with an estimated rate (no longer incomplete) when a credit-card has no rate cadastrada but a balance", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({
      debts: [creditCard({ id: "nu", balanceReais: 3000, statementReais: 1000, revolvingMonthly: null })],
      reserveReais: 5000, freeBalanceReais: 800,
    }));
    expect(out.state).toBe("bleeding");
    expect(out.dominant?.type).toBe("pay_debt");
    expect(out.dominant?.targetDebtId).toBe("nu");
    expect(out.dominant?.metrics.rateEstimated).toBe(true);
    expect(typeof out.dominant?.metrics.monthsToPayoff).toBe("number");
    expect(out.completeness.complete).toBe(true);
    expect(out.completeness.missing).not.toContain("debt_rate");
  });
  it("does not mark rateEstimated when the credit-card rate is cadastrada", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({
      debts: [creditCard({ id: "nu", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.12 })],
      reserveReais: 5000, freeBalanceReais: 800,
    }));
    expect(out.dominant?.metrics.rateEstimated).toBeFalsy();
  });
});

describe("PrescriptionEngine — state classification", () => {
  it("tight when free balance is negative", () => {
    expect(PrescriptionEngine.prescribe(baseSnapshot({ freeBalanceReais: -300 })).state).toBe("tight");
  });
  it("tight when committed pct over 50 even with positive free balance", () => {
    expect(PrescriptionEngine.prescribe(baseSnapshot({ committedPct: 55, freeBalanceReais: 200 })).state).toBe("tight");
  });
  it("bleeding when an expensive debt exists and reserve at/above min safety", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({
      debts: [creditCard({ balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.12 })],
      reserveReais: 5000, committedPct: 30, freeBalanceReais: 800,
    }));
    expect(out.state).toBe("bleeding");
  });
  it("no_cushion when no expensive debt and reserve below floor", () => {
    expect(PrescriptionEngine.prescribe(baseSnapshot({ debts: [], reserveReais: 1000 })).state).toBe("no_cushion");
  });
  it("ready_to_grow when no expensive debt and reserve at/above floor", () => {
    expect(PrescriptionEngine.prescribe(baseSnapshot({ debts: [], reserveReais: 6000 })).state).toBe("ready_to_grow");
  });
  it("free balance exactly zero is tight, never ready_to_grow (no hollow zero invest)", () => {
    const p = PrescriptionEngine.prescribe({
      now: NOW, debts: [], monthlyIncomeReais: 3000, monthlyEssentialReais: 0,
      freeBalanceReais: 0, committedPct: 0, reserveReais: 999999, hasEstimatedIncome: false, config: PRESCRIPTION_CONFIG,
    });
    expect(p.state).toBe("tight");
  });
});

describe("PrescriptionEngine — dominant move metrics", () => {
  it("pay_debt targets the highest-rate expensive debt; min-only never pays off so it reports monthsToPayoff with extra", () => {
    const cheap = creditCard({ id: "cheapCard", label: "Loja", balanceReais: 2000, statementReais: 500, revolvingMonthly: 0.05 });
    const dear = creditCard({ id: "nubank", label: "Nubank", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.129 });
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [cheap, dear], reserveReais: 5000, freeBalanceReais: 800 }));
    expect(out.state).toBe("bleeding");
    expect(out.dominant?.type).toBe("pay_debt");
    expect(out.dominant?.targetDebtId).toBe("nubank");
    expect(out.dominant?.metrics.baselineNeverPayoff).toBe(true);
    expect(out.dominant?.metrics.interestSavedReais).toBeUndefined();
    expect(typeof out.dominant?.metrics.monthsToPayoff).toBe("number");
    expect(out.dominant?.rankImpactReais ?? 0).toBeGreaterThan(0);
  });
  it("pay_debt on an amortizing expensive debt reports credible interest saved and months saved", () => {
    // annual 0.80 → monthly ≈ 5%/mo (> 4% expensive threshold). installment 300 > interest (~150 on 3000) → amortizes.
    const loan = personalLoan({ id: "loan", label: "Crédito pessoal", balanceReais: 3000, annualRate: 0.8, termMonths: 24, installmentReais: 300 });
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [loan], reserveReais: 5000, freeBalanceReais: 400 }));
    expect(out.state).toBe("bleeding");
    expect(out.dominant?.type).toBe("pay_debt");
    expect(out.dominant?.metrics.baselineNeverPayoff).toBe(false);
    expect(out.dominant?.metrics.interestSavedReais ?? 0).toBeGreaterThan(0);
    expect(out.dominant?.metrics.monthsSaved ?? 0).toBeGreaterThan(0);
  });
  it("guard-rail: expensive debt but reserve below min safety -> build_reserve dominant", () => {
    const dear = creditCard({ id: "nubank", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.129 });
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [dear], reserveReais: 500, monthlyEssentialReais: 2000, freeBalanceReais: 800 }));
    expect(out.state).toBe("no_cushion");
    expect(out.dominant?.type).toBe("build_reserve");
    expect(out.dominant?.reasonCode).toBe("below_min_safety");
    expect(out.dominant?.metrics.reserveGapReais).toBeCloseTo(1500, 2);
    expect(out.dominant?.metrics.monthsToReserve).toBe(2);
    expect(out.alternatives.length).toBe(0);
  });
  it("no_cushion (no expensive debt): build_reserve up to floor", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [], reserveReais: 1000, monthlyEssentialReais: 2000, freeBalanceReais: 1000 }));
    expect(out.dominant?.type).toBe("build_reserve");
    expect(out.dominant?.reasonCode).toBe("below_reserve_floor");
    expect(out.dominant?.metrics.reserveGapReais).toBeCloseTo(5000, 2);
    expect(out.dominant?.metrics.monthsToReserve).toBe(5);
  });
  it("ready_to_grow: invest projects 12-month simple growth on the free balance", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [], reserveReais: 6000, freeBalanceReais: 1000 }));
    expect(out.dominant?.type).toBe("invest");
    expect(out.dominant?.metrics.monthlyContributionReais).toBe(1000);
    expect(out.dominant?.metrics.projectedGrowthReais ?? 0).toBeGreaterThan(0);
  });
  it("tight: reduce_commitment reports the reduction needed to clear the red", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({ freeBalanceReais: -300 }));
    expect(out.dominant?.type).toBe("reduce_commitment");
    expect(out.dominant?.reasonCode).toBe("negative_free_balance");
    expect(out.dominant?.metrics.targetReductionReais).toBeCloseTo(300, 2);
  });
});

describe("PrescriptionEngine — ranked alternatives", () => {
  it("bleeding with two expensive debts ranks the second debt as an alternative, dominant excluded", () => {
    const dear = creditCard({ id: "nubank", label: "Nubank", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.129 });
    const mid = creditCard({ id: "itau", label: "Itaú", balanceReais: 4000, statementReais: 1200, revolvingMonthly: 0.08 });
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [dear, mid], reserveReais: 5000, freeBalanceReais: 800 }));
    expect(out.dominant?.targetDebtId).toBe("nubank");
    const ids = out.alternatives.map((m) => m.targetDebtId);
    expect(ids).toContain("itau");
    expect(ids).not.toContain("nubank");
    expect(out.alternatives.length).toBeLessThanOrEqual(2);
  });
  it("caps total moves (dominant + alternatives) at 3", () => {
    const a = creditCard({ id: "a", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.13 });
    const b = creditCard({ id: "b", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.12 });
    const c = creditCard({ id: "c", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.11 });
    const d = creditCard({ id: "d", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.10 });
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [a, b, c, d], reserveReais: 5000, freeBalanceReais: 800 }));
    expect(out.alternatives.length).toBeLessThanOrEqual(2);
  });
  it("drops zero-impact alternatives", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [], reserveReais: 6000, freeBalanceReais: 1000 }));
    expect(out.alternatives.every((m) => m.rankImpactReais > 0)).toBe(true);
  });
});

describe("PrescriptionEngine — estimated income cautious branch", () => {
  it("estimated income with surplus and full reserve yields keep_buffer_estimated, not invest", () => {
    const p = PrescriptionEngine.prescribe(baseSnapshot({
      debts: [], monthlyIncomeReais: 5000, monthlyEssentialReais: 0,
      freeBalanceReais: 2000, committedPct: 0, reserveReais: 999999, hasEstimatedIncome: true,
    }));
    expect(p.dominant?.type).toBe("build_reserve");
    expect(p.dominant?.reasonCode).toBe("keep_buffer_estimated");
  });

  it("keep_buffer_estimated move has no hollow number metrics", () => {
    const p = PrescriptionEngine.prescribe(baseSnapshot({
      debts: [], monthlyIncomeReais: 5000, monthlyEssentialReais: 2000,
      freeBalanceReais: 1000, committedPct: 0, reserveReais: 999999, hasEstimatedIncome: true,
    }));
    expect(p.dominant?.reasonCode).toBe("keep_buffer_estimated");
    expect(p.dominant?.metrics.reserveGapReais).toBeUndefined();
    expect(p.dominant?.metrics.monthlyContributionReais).toBeUndefined();
  });

  it("firm income in ready_to_grow still yields invest", () => {
    const p = PrescriptionEngine.prescribe(baseSnapshot({
      debts: [], reserveReais: 6000, freeBalanceReais: 1000, hasEstimatedIncome: false,
    }));
    expect(p.dominant?.type).toBe("invest");
  });

  it("hasEstimatedIncome propagates to the Prescription output", () => {
    const p = PrescriptionEngine.prescribe(baseSnapshot({ hasEstimatedIncome: true }));
    expect(p.hasEstimatedIncome).toBe(true);
  });
});

describe("PrescriptionEngine — multi-month timeline (cascade)", () => {
  it("bleeding with payable expensive debts yields a timeline with at least one debt segment", () => {
    const dear = creditCard({ id: "dear", label: "Cartão caro", balanceReais: 2000, statementReais: 800, revolvingMonthly: 0.13 });
    const mid = creditCard({ id: "mid", label: "Cartão médio", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.08 });
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [dear, mid], reserveReais: 5000, freeBalanceReais: 800 }));
    expect(out.state).toBe("bleeding");
    expect(out.timeline.length).toBeGreaterThan(0);
    expect(out.timeline.some((seg) => seg.kind === "debt")).toBe(true);
  });
  it("ready_to_grow has no timeline", () => {
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [], reserveReais: 6000, freeBalanceReais: 1000 }));
    expect(out.timeline).toEqual([]);
  });
  it("a single expensive debt that never pays within the horizon has no timeline (only a horizon cut does not qualify)", () => {
    const big = creditCard({ id: "big", label: "Cartão estourado", balanceReais: 50000, statementReais: 2000, revolvingMonthly: 0.15 });
    const out = PrescriptionEngine.prescribe(baseSnapshot({ debts: [big], reserveReais: 5000, freeBalanceReais: 200 }));
    expect(out.state).toBe("bleeding");
    expect(out.timeline).toEqual([]);
  });
});
