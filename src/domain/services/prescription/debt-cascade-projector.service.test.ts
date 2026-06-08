import { describe, expect, it } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { DebtCascadeProjectorService } from "./debt-cascade-projector.service";

const NOW = new Date("2026-06-01T00:00:00Z");

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
  id: string;
  label: string;
  balanceReais: number;
  statementReais: number;
  revolvingMonthly: number;
}): DebtEntity {
  return {
    id: opts.id, userId: "u1", label: opts.label, kind: "credit_card", status: "active",
    currentBalance: money(opts.balanceReais), originalPrincipal: money(opts.balanceReais),
    creditLimit: money(opts.balanceReais * 3), statementDay: 1, dueDay: 10,
    currentStatement: money(opts.statementReais), revolvingBalance: money(opts.balanceReais),
    revolvingMonthlyRate: monthlyRate(opts.revolvingMonthly), installmentPurchases: [],
    createdAt: NOW, deletedAt: null,
  } as unknown as DebtEntity;
}

describe("DebtCascadeProjectorService", () => {
  it("returns no segments when there are no debts", () => {
    const out = DebtCascadeProjectorService.project({
      debts: [], monthlyFreeBalance: 800, startingFrom: NOW, horizonMonths: 12,
    });
    expect(out).toEqual([]);
  });

  it("single debt that pays off within the horizon yields a debt segment then a reserve segment", () => {
    const card = creditCard({ id: "nu", label: "Nubank", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.13 });
    const out = DebtCascadeProjectorService.project({
      debts: [card], monthlyFreeBalance: 800, startingFrom: NOW, horizonMonths: 12,
    });
    expect(out.length).toBe(2);
    expect(out[0]).toMatchObject({ kind: "debt", debtLabel: "Nubank", startMonth: 1 });
    const first = out[0] as { kind: "debt"; payoffMonth: number };
    expect(first.payoffMonth).toBeGreaterThan(0);
    expect(first.payoffMonth).toBeLessThanOrEqual(12);
    expect(out[1]).toEqual({ kind: "reserve", startMonth: first.payoffMonth + 1 });
  });

  it("attacks the highest-rate debt first and chains the next phase right after payoff", () => {
    const dear = creditCard({ id: "dear", label: "Cartão caro", balanceReais: 2000, statementReais: 800, revolvingMonthly: 0.13 });
    const mid = creditCard({ id: "mid", label: "Cartão médio", balanceReais: 3000, statementReais: 1000, revolvingMonthly: 0.08 });
    const out = DebtCascadeProjectorService.project({
      debts: [mid, dear], monthlyFreeBalance: 600, startingFrom: NOW, horizonMonths: 12,
    });
    expect(out[0]).toMatchObject({ kind: "debt", debtLabel: "Cartão caro", startMonth: 1 });
    const first = out[0] as { kind: "debt"; payoffMonth: number };
    const second = out[1];
    expect(second).toBeDefined();
    expect(second?.startMonth).toBe(first.payoffMonth + 1);
    // o segundo trecho é a próxima dívida (quita ou corta no horizonte), nunca o cartão caro de novo
    if (second && (second.kind === "debt" || second.kind === "horizon_cut")) {
      expect(second.debtLabel).toBe("Cartão médio");
    }
  });

  it("a debt that never pays within the horizon yields a single horizon_cut segment", () => {
    // saldo enorme + sobra pequena: o pagamento não cobre os juros, nunca quita.
    const card = creditCard({ id: "big", label: "Cartão estourado", balanceReais: 50000, statementReais: 2000, revolvingMonthly: 0.15 });
    const out = DebtCascadeProjectorService.project({
      debts: [card], monthlyFreeBalance: 200, startingFrom: NOW, horizonMonths: 12,
    });
    expect(out.length).toBe(1);
    expect(out[0]).toEqual({ kind: "horizon_cut", debtLabel: "Cartão estourado", startMonth: 1 });
  });
});
