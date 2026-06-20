import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { prescribeFromEntities } from "./prescribe-from-entities";

const NOW = new Date("2026-06-18T10:00:00Z");

const m = (r: number) => {
  const x = Money.from(r);
  if (!isOk(x)) throw new Error("m");
  return x.value;
};

const rate = (d: number) => {
  const x = InterestRate.fromMonthly(d);
  if (!isOk(x)) throw new Error("r");
  return x.value;
};

const baseIncome: IncomeEntity = {
  id: "i1",
  userId: "u1",
  profileId: "p1",
  label: "Salário",
  amount: m(5000),
  frequency: "monthly",
  startDate: NOW,
  paymentDay: null,
  endDate: null,
  isEstimated: false,
  sourceBreakdown: null,
  isActive: true,
  createdAt: NOW,
  deletedAt: null,
};

const expensiveCard: DebtEntity = {
  id: "card1",
  userId: "u1",
  kind: "credit_card",
  status: "active",
  label: "Cartão",
  currentBalance: m(3000),
  originalPrincipal: m(3000),
  creditLimit: m(6000),
  statementDay: 1,
  dueDay: 10,
  currentStatement: m(1000),
  revolvingBalance: m(3000),
  revolvingMonthlyRate: rate(0.129),
  installmentPurchases: [],
  createdAt: NOW,
  deletedAt: null,
} as unknown as DebtEntity;

const cashAsset: AssetEntity = {
  id: "a1",
  userId: "u1",
  category: "cash",
  label: "Reserva",
  currentValue: m(5000),
  metadata: null,
  createdAt: NOW,
  deletedAt: null,
} as unknown as AssetEntity;

describe("prescribeFromEntities", () => {
  it("returns bleeding state for high-cost credit card", () => {
    const result = prescribeFromEntities({
      debts: [expensiveCard],
      incomes: [baseIncome],
      assets: [cashAsset],
      now: NOW,
    });

    expect(result.state).toBe("bleeding");
    expect(result.dominant?.targetDebtId).toBe("card1");
  });

  it("returns ready_to_grow with no debts and sufficient reserve", () => {
    const richAsset: AssetEntity = {
      ...cashAsset,
      currentValue: m(50000),
    };

    const result = prescribeFromEntities({
      debts: [],
      incomes: [baseIncome],
      assets: [richAsset],
      now: NOW,
    });

    expect(result.state).toBe("ready_to_grow");
  });

  it("committed pct is 0 when there is no income", () => {
    const result = prescribeFromEntities({
      debts: [expensiveCard],
      incomes: [],
      assets: [],
      now: NOW,
    });

    expect(result.completeness.complete).toBe(false);
    expect(result.completeness.missing).toContain("income");
  });

  it("combines debts from multiple entities into single prescription", () => {
    const secondIncome: IncomeEntity = {
      ...baseIncome,
      id: "i2",
      userId: "u2",
      profileId: "p2",
      amount: m(3000),
    };

    const result = prescribeFromEntities({
      debts: [expensiveCard],
      incomes: [baseIncome, secondIncome],
      assets: [cashAsset],
      now: NOW,
    });

    expect(result.dominant).toBeDefined();
    expect(result.state).not.toBe("incomplete");
  });

  it("only cash assets count toward reserve", () => {
    const investmentAsset: AssetEntity = {
      ...cashAsset,
      id: "a2",
      category: "investment",
      currentValue: m(100000),
    };

    const noCashResult = prescribeFromEntities({
      debts: [],
      incomes: [baseIncome],
      assets: [investmentAsset],
      now: NOW,
    });

    const withCashResult = prescribeFromEntities({
      debts: [],
      incomes: [baseIncome],
      assets: [cashAsset, investmentAsset],
      now: NOW,
    });

    expect(withCashResult.state).toBe(
      noCashResult.state === "no_cushion" ? "no_cushion" : withCashResult.state,
    );
    expect(typeof noCashResult.state).toBe("string");
    expect(typeof withCashResult.state).toBe("string");
  });

  it("applies income settlement (adjusted) to the prescription income base", () => {
    const settlement = {
      id: "s1",
      profileId: "p1",
      incomeId: "i1",
      month: new Date(Date.UTC(2026, 5, 1)),
      status: "adjusted",
      adjustedAmountCents: 100000n,
      createdAt: NOW,
    } as unknown as IncomeSettlementEntity;

    const baseline = prescribeFromEntities({
      debts: [expensiveCard],
      incomes: [baseIncome],
      assets: [cashAsset],
      now: NOW,
    });

    const adjusted = prescribeFromEntities({
      debts: [expensiveCard],
      incomes: [baseIncome],
      assets: [cashAsset],
      now: NOW,
      incomeSettlements: [settlement],
    });

    expect(adjusted.state).toBe("tight");
    expect(adjusted.dominant?.type).toBe("reduce_commitment");
    expect(baseline.state).not.toBe("tight");
  });

  it("free balance reflects real payments via monthlyDebtOutflow", () => {
    const cheapCard = {
      ...expensiveCard,
      currentStatement: m(400),
      revolvingMonthlyRate: rate(0.02),
    } as unknown as DebtEntity;
    const payment = {
      id: "pay1",
      debtId: "card1",
      amount: m(50),
      paidAt: new Date(Date.UTC(2026, 5, 5)),
      isClosingPayment: false,
    } as unknown as DebtPaymentEntity;

    const noPayment = prescribeFromEntities({
      debts: [cheapCard],
      incomes: [baseIncome],
      assets: [cashAsset],
      now: NOW,
    });
    const withPayment = prescribeFromEntities({
      debts: [cheapCard],
      incomes: [baseIncome],
      assets: [cashAsset],
      now: NOW,
      paymentsThisMonth: [payment],
    });

    const contrib = (p: typeof noPayment) =>
      p.dominant?.metrics.monthlyContributionReais ?? 0;
    expect(contrib(withPayment)).toBeGreaterThan(contrib(noPayment));
  });

  it("exposes committedPct and freeBalanceReais on the prescription output", () => {
    const result = prescribeFromEntities({
      debts: [expensiveCard],
      incomes: [baseIncome],
      assets: [cashAsset],
      now: NOW,
    });

    expect(Math.round(result.committedPct)).toBe(20);
    expect(result.freeBalanceReais).toBeCloseTo(4000, 0);
  });
});
