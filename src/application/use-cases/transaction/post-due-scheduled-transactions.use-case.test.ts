import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";

import {
  postDueScheduledTransactions,
  type PostDueScheduledTransactionsDeps,
} from "./post-due-scheduled-transactions.use-case";

function cashAsset(over: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "acc1",
    userId: "u1",
    profileId: "p1",
    category: "cash",
    label: "Carteira",
    currentValue: Money.fromCents(100000n),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    anchorAt: null,
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    ...over,
  } as AssetEntity;
}

function scheduledTxn(over: Partial<TransactionEntity> = {}): TransactionEntity {
  return {
    id: "t1",
    userId: "u1",
    profileId: "p1",
    direction: "out",
    amount: Money.fromCents(30000n),
    description: "Aluguel",
    category: null,
    accountId: "acc1",
    occurredAt: new Date("2026-06-20T12:00:00Z"),
    status: "scheduled",
    excludedFromTotals: false,
    source: "manual",
    externalId: null,
    createdAt: new Date("2026-06-10T00:00:00Z"),
    deletedAt: null,
    ...over,
  };
}

function makeDeps(
  due: TransactionEntity[],
  account: AssetEntity | null = cashAsset(),
): { deps: PostDueScheduledTransactionsDeps; updatedAssets: AssetEntity[]; updatedTxns: TransactionEntity[] } {
  const updatedAssets: AssetEntity[] = [];
  const updatedTxns: TransactionEntity[] = [];
  const deps: PostDueScheduledTransactionsDeps = {
    transactions: {
      listDueScheduled: vi.fn(async () => due),
      update: vi.fn(async (t: TransactionEntity) => {
        updatedTxns.push(t);
        return t;
      }),
    },
    assets: {
      findById: vi.fn(async () => account),
      update: vi.fn(async (a: AssetEntity) => {
        updatedAssets.push(a);
      }),
    } as unknown as PostDueScheduledTransactionsDeps["assets"],
    clock: { now: () => new Date("2026-06-21T06:00:00Z") },
  };
  return { deps, updatedAssets, updatedTxns };
}

describe("postDueScheduledTransactions", () => {
  it("posta saída agendada vencida: abate saldo e marca paga", async () => {
    const { deps, updatedAssets, updatedTxns } = makeDeps([scheduledTxn()]);
    const res = await postDueScheduledTransactions(deps);
    expect(res.postedCount).toBe(1);
    expect(updatedAssets[0]!.currentValue.toCents()).toBe(70000n);
    expect(updatedTxns[0]!.status).toBe("paid");
  });

  it("posta entrada agendada: soma no saldo", async () => {
    const { deps, updatedAssets } = makeDeps([
      scheduledTxn({ direction: "in", amount: Money.fromCents(50000n) }),
    ]);
    await postDueScheduledTransactions(deps);
    expect(updatedAssets[0]!.currentValue.toCents()).toBe(150000n);
  });

  it("pula quando a conta não existe mais", async () => {
    const { deps, updatedAssets, updatedTxns } = makeDeps([scheduledTxn()], null);
    const res = await postDueScheduledTransactions(deps);
    expect(res.postedCount).toBe(0);
    expect(res.skippedCount).toBe(1);
    expect(updatedAssets).toHaveLength(0);
    expect(updatedTxns).toHaveLength(0);
  });

  it("pula transação sem conta", async () => {
    const { deps } = makeDeps([scheduledTxn({ accountId: null })]);
    const res = await postDueScheduledTransactions(deps);
    expect(res.postedCount).toBe(0);
    expect(res.skippedCount).toBe(1);
  });
});
