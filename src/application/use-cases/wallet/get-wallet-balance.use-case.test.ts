import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { getWalletBalance, type GetWalletBalanceDeps } from "./get-wallet-balance.use-case";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
  return r.value;
}
const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));

function wallet(over: Partial<AssetEntity>): AssetEntity {
  return {
    id: "wallet-1",
    userId: "u1",
    profileId: "profile-1",
    category: "cash",
    label: "Carteira",
    currentValue: moneyOf(500),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: utc(2026, 6, 1),
    updatedAt: utc(2026, 6, 1),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    anchorAt: utc(2026, 6, 1),
    externalAccountKey: null,
    ...over,
  } as unknown as AssetEntity;
}

function income(over: Partial<IncomeEntity>): IncomeEntity {
  return {
    id: "i1",
    userId: "u1",
    profileId: "profile-1",
    label: "Salário",
    amount: moneyOf(5000),
    frequency: "monthly",
    startDate: utc(2026, 1, 1),
    endDate: null,
    isEstimated: false,
    isActive: true,
    paymentDay: 5,
    createdAt: utc(2026, 1, 1),
    deletedAt: null,
    ...over,
  } as unknown as IncomeEntity;
}

function recurringDebt(over: Partial<DebtEntity>): DebtEntity {
  return {
    id: "d1",
    userId: "u1",
    kind: "recurring",
    label: "Aluguel",
    status: "active",
    currentBalance: moneyOf(0),
    recurringFrequency: "monthly",
    recurringAmountCents: 120000n,
    expenseCategory: "housing",
    dueDay: 10,
    startDate: utc(2026, 1, 1),
    expectedEndDate: null,
    createdAt: utc(2026, 1, 1),
    deletedAt: null,
    ...over,
  } as unknown as DebtEntity;
}

function deps(over: Partial<GetWalletBalanceDeps>): GetWalletBalanceDeps {
  return {
    assets: {
      findActiveByProfileAndCategory: async () => [wallet({})],
      createDefaultWallet: async () => {},
    },
    incomes: { listForProfile: async () => [income({})] },
    debts: { listForProfile: async () => [] },
    settlements: { listForUserMonth: async () => [] },
    incomeSettlements: { listForUserMonth: async () => [] },
    debtPayments: { listForProfileInRange: async () => [] },
    transactions: { listForProfileInRange: async () => [] },
    debtAmountAdjustments: { listForProfile: async () => [] },
    clock: { now: () => utc(2026, 6, 4) },
    ...over,
  } as GetWalletBalanceDeps;
}

describe("getWalletBalance", () => {
  it("reactive balance excludes income that has not landed yet", async () => {
    // asOf June 4, salary lands June 5 -> still just the anchor 500.
    const r = await getWalletBalance(deps({}), { userId: "u1", profileId: "profile-1" });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.reactiveBalance.toNumber()).toBe(500);
  });

  it("month-end projection includes income that will land this month", async () => {
    const r = await getWalletBalance(deps({}), { userId: "u1", profileId: "profile-1" });
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.monthEndProjection.toNumber()).toBe(5500);
  });

  it("creates a dedicated Carteira (needsAnchor) when the user has none", async () => {
    const r = await getWalletBalance(
      deps({ assets: { findActiveByProfileAndCategory: async () => [], createDefaultWallet: async () => {} } }),
      { userId: "u1", profileId: "profile-1" },
    );
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.needsAnchor).toBe(true);
  });

  it("flags needsAnchor when the wallet has never been anchored", async () => {
    const r = await getWalletBalance(deps({ assets: { findActiveByProfileAndCategory: async () => [wallet({ anchorAt: null })], createDefaultWallet: async () => {} } }), { userId: "u1", profileId: "profile-1" });
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.needsAnchor).toBe(true);
  });

  it("needsAnchor is false once anchored", async () => {
    const r = await getWalletBalance(deps({}), { userId: "u1", profileId: "profile-1" });
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.needsAnchor).toBe(false);
  });

  it("does not subtract a debt before its due day", async () => {
    const d = deps({
      debts: { listForProfile: async () => [recurringDebt({})] },
      clock: { now: () => utc(2026, 6, 7) },
    });
    const r = await getWalletBalance(d, { userId: "u1", profileId: "profile-1" });
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.reactiveBalance.toNumber()).toBe(5500);
  });

  it("includes a due-this-month debt in the projection", async () => {
    const d = deps({
      debts: { listForProfile: async () => [recurringDebt({})] },
      clock: { now: () => utc(2026, 6, 7) },
    });
    const r = await getWalletBalance(d, { userId: "u1", profileId: "profile-1" });
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.monthEndProjection.toNumber()).toBe(4300);
  });

  it("counts a payment toward a debt no longer in the active list (quitação this month)", async () => {
    // Regressão: a quitação some da lista de dívidas ativas, mas o pagamento
    // do mês ainda saiu da carteira. Antes da unificação a carteira ignorava
    // esse pagamento e projetava sobra falsa.
    const d = deps({
      debts: { listForProfile: async () => [] },
      debtPayments: {
        listForProfileInRange: async () => [
          {
            id: "p-quit",
            debtId: "gone",
            paidAt: utc(2026, 6, 3),
            amount: moneyOf(2000),
            principalPortion: moneyOf(2000),
            interestPortion: moneyOf(0),
            isExtra: false,
            isClosingPayment: true,
          },
        ],
      },
      clock: { now: () => utc(2026, 6, 4) },
    });
    const r = await getWalletBalance(d, { userId: "u1", profileId: "profile-1" });
    if (!isOk(r)) throw new Error("expected ok");
    // anchor 500 - pagamento 2000 (realizado em 3/jun) = -1500.
    expect(r.value.reactiveBalance.toNumber()).toBe(-1500);
  });
});
