import { describe, expect, it, vi } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { CreditCardDebt, RecurringDebt } from "@/domain/entities/debt.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtAmountAdjustmentEntity } from "@/domain/entities/debt-amount-adjustment.entity";
import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { isErr, isOk } from "@/shared/errors/result";

import {
  BASE_CURRENCY,
  convertAdjustmentToBase,
  convertAllocationToBase,
  convertAssetToBase,
  convertDebtToBase,
  convertIncomeToBase,
  convertPaymentToBase,
} from "./convert-entity-to-base";

const NOW = new Date("2024-01-10T00:00:00Z");

function makeDeps(rate: string | null) {
  return {
    rates: {
      upsertDaily: vi.fn(),
      findLatest: vi.fn().mockResolvedValue(rate ? { rateDecimal: rate, asOf: NOW } : null),
    },
    overrides: {
      find: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      remove: vi.fn(),
      listForUser: vi.fn(),
    },
    clock: { now: vi.fn(() => NOW) },
  };
}

describe("convertAssetToBase", () => {
  it("leaves a base-currency asset untouched (no lookup)", async () => {
    const deps = makeDeps(null);
    const asset = { id: "a1", currentValue: Money.fromCents(10000n, "BRL") } as AssetEntity;
    const r = await convertAssetToBase(deps, "u1", asset, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.currentValue.toCents()).toBe(10000n);
    expect(deps.rates.findLatest).not.toHaveBeenCalled();
  });

  it("converts a USD asset to BRL using the resolved rate", async () => {
    const deps = makeDeps("5.00");
    const asset = { id: "a1", currentValue: Money.fromCents(10000n, "USD") } as AssetEntity;
    const r = await convertAssetToBase(deps, "u1", asset, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.currentValue.currency).toBe("BRL");
      expect(r.value.currentValue.toCents()).toBe(50000n);
    }
  });

  it("errors when no rate exists for a foreign asset", async () => {
    const deps = makeDeps(null);
    const asset = { id: "a1", currentValue: Money.fromCents(10000n, "USD") } as AssetEntity;
    const r = await convertAssetToBase(deps, "u1", asset, BASE_CURRENCY);
    expect(isErr(r)).toBe(true);
  });
});

describe("convertIncomeToBase", () => {
  it("converts a USD income amount to BRL", async () => {
    const deps = makeDeps("5.00");
    const income = { id: "i1", amount: Money.fromCents(20000n, "USD") } as IncomeEntity;
    const r = await convertIncomeToBase(deps, "u1", income, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.amount.toCents()).toBe(100000n);
  });
});

describe("convertDebtToBase", () => {
  it("converts every Money field of a USD credit_card debt to BRL", async () => {
    const deps = makeDeps("5.00");
    const debt: CreditCardDebt = {
      id: "d1",
      userId: "u1",
      label: "Cartão",
      status: "active",
      kind: "credit_card",
      originalPrincipal: Money.fromCents(100000n, "USD"),
      currentBalance: Money.fromCents(80000n, "USD"),
      startDate: NOW,
      expectedEndDate: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
      creditLimit: Money.fromCents(500000n, "USD"),
      statementDay: 10,
      dueDay: 20,
      currentStatement: Money.fromCents(30000n, "USD"),
      revolvingBalance: Money.fromCents(15000n, "USD"),
      revolvingMonthlyRate: null,
      installmentPurchases: [
        {
          description: "Notebook",
          total: Money.fromCents(60000n, "USD"),
          installmentsTotal: 6,
          installmentsRemaining: 4,
          monthlyValue: Money.fromCents(10000n, "USD"),
        },
      ],
    };

    const r = await convertDebtToBase(deps, "u1", debt, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r) && r.value.kind === "credit_card") {
      const v = r.value;
      expect(v.originalPrincipal.currency).toBe("BRL");
      expect(v.originalPrincipal.toCents()).toBe(500000n);
      expect(v.currentBalance.currency).toBe("BRL");
      expect(v.currentBalance.toCents()).toBe(400000n);
      expect(v.creditLimit?.currency).toBe("BRL");
      expect(v.creditLimit?.toCents()).toBe(2500000n);
      expect(v.currentStatement.currency).toBe("BRL");
      expect(v.currentStatement.toCents()).toBe(150000n);
      expect(v.revolvingBalance?.currency).toBe("BRL");
      expect(v.revolvingBalance?.toCents()).toBe(75000n);
      expect(v.installmentPurchases[0]?.total.currency).toBe("BRL");
      expect(v.installmentPurchases[0]?.total.toCents()).toBe(300000n);
      expect(v.installmentPurchases[0]?.monthlyValue.currency).toBe("BRL");
      expect(v.installmentPurchases[0]?.monthlyValue.toCents()).toBe(50000n);
    }
  });

  it("errors when no rate exists for a foreign debt", async () => {
    const deps = makeDeps(null);
    const debt = {
      kind: "personal_loan",
      currentBalance: Money.fromCents(10000n, "USD"),
    } as unknown as import("@/domain/entities/debt.entity").DebtEntity;
    const r = await convertDebtToBase(deps, "u1", debt, BASE_CURRENCY);
    expect(isErr(r)).toBe(true);
  });

  it("converts recurringAmountCents for a USD recurring debt", async () => {
    const deps = makeDeps("5.00");
    const debt: RecurringDebt = {
      id: "d2",
      userId: "u1",
      label: "Netflix",
      status: "active",
      kind: "recurring",
      originalPrincipal: Money.fromCents(0n, "USD"),
      currentBalance: Money.fromCents(0n, "USD"),
      startDate: NOW,
      expectedEndDate: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
      recurringFrequency: "monthly",
      recurringAmountCents: 1500n,
      expenseCategory: "subscriptions",
      dueDay: null,
    };

    const r = await convertDebtToBase(deps, "u1", debt, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r) && r.value.kind === "recurring") {
      expect(r.value.recurringAmountCents).toBe(7500n);
    }
  });
});

describe("convertPaymentToBase", () => {
  it("converts amount, principalPortion and interestPortion of a USD payment", async () => {
    const deps = makeDeps("5.00");
    const payment: DebtPaymentEntity = {
      id: "p1",
      debtId: "d1",
      paidAt: NOW,
      amount: Money.fromCents(10000n, "USD"),
      principalPortion: Money.fromCents(7000n, "USD"),
      interestPortion: Money.fromCents(3000n, "USD"),
      isExtra: false,
      isClosingPayment: false,
    };
    const r = await convertPaymentToBase(deps, "u1", payment, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.amount.currency).toBe("BRL");
      expect(r.value.amount.toCents()).toBe(50000n);
      expect(r.value.principalPortion.toCents()).toBe(35000n);
      expect(r.value.interestPortion.toCents()).toBe(15000n);
    }
  });

  it("errors when no rate exists for a foreign payment", async () => {
    const deps = makeDeps(null);
    const payment: DebtPaymentEntity = {
      id: "p1",
      debtId: "d1",
      paidAt: NOW,
      amount: Money.fromCents(10000n, "USD"),
      principalPortion: Money.fromCents(7000n, "USD"),
      interestPortion: Money.fromCents(3000n, "USD"),
      isExtra: false,
      isClosingPayment: false,
    };
    const r = await convertPaymentToBase(deps, "u1", payment, BASE_CURRENCY);
    expect(isErr(r)).toBe(true);
  });
});

describe("convertAdjustmentToBase", () => {
  it("converts the amount of a USD adjustment", async () => {
    const deps = makeDeps("5.00");
    const adjustment: DebtAmountAdjustmentEntity = {
      id: "adj1",
      debtId: "d1",
      userId: "u1",
      amount: Money.fromCents(2000n, "USD"),
      note: null,
      createdAt: NOW,
      updatedAt: NOW,
      kind: "override",
      month: "2024-01",
    };
    const r = await convertAdjustmentToBase(deps, "u1", adjustment, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.amount.currency).toBe("BRL");
      expect(r.value.amount.toCents()).toBe(10000n);
    }
  });
});

describe("convertAllocationToBase", () => {
  it("converts allocationOriginal of a USD allocation", async () => {
    const deps = makeDeps("5.00");
    const allocation: AssetDebtAllocation = {
      id: "al1",
      assetId: "a1",
      debtId: "d1",
      allocationOriginal: Money.fromCents(40000n, "USD"),
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = await convertAllocationToBase(deps, "u1", allocation, BASE_CURRENCY);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.allocationOriginal.currency).toBe("BRL");
      expect(r.value.allocationOriginal.toCents()).toBe(200000n);
    }
  });
});
