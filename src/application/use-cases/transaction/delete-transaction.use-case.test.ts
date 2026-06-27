import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { deleteTransaction } from "./delete-transaction.use-case";

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
    monthlyCostEstimateCents: null,
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

function txn(over: Partial<TransactionEntity> = {}): TransactionEntity {
  return {
    id: "t1",
    userId: "u1",
    profileId: "p1",
    direction: "out",
    amount: Money.fromCents(30000n),
    description: "Mercado",
    category: null,
    accountId: "acc1",
    assetId: null,
    occurredAt: new Date("2026-06-20T12:00:00Z"),
    status: "paid",
    excludedFromTotals: false,
    source: "manual",
    externalId: null,
    createdAt: new Date("2026-06-20T12:00:00Z"),
    deletedAt: null,
    ...over,
  };
}

function makeDeps(initial: TransactionEntity | null, account: AssetEntity = cashAsset()) {
  const deleted: string[] = [];
  const updatedAssets: AssetEntity[] = [];
  return {
    deleted,
    updatedAssets,
    deps: {
      transactions: {
        findByIdForProfile: vi.fn(async () => initial),
        softDelete: vi.fn(async (id: string) => {
          deleted.push(id);
        }),
      },
      assets: {
        findById: vi.fn(async () => account),
        update: vi.fn(async (a: AssetEntity) => {
          updatedAssets.push(a);
        }),
      },
      clock: { now: () => new Date("2026-06-21T00:00:00Z") },
    },
  };
}

describe("deleteTransaction", () => {
  it("apagar saída paga devolve o valor ao saldo", async () => {
    const { deps, deleted, updatedAssets } = makeDeps(txn());
    const res = await deleteTransaction(deps, { profileId: "p1", transactionId: "t1" });
    expect(isOk(res)).toBe(true);
    expect(deleted).toEqual(["t1"]);
    expect(updatedAssets[0]!.currentValue.toCents()).toBe(130000n);
  });

  it("apagar entrada paga retira o valor do saldo", async () => {
    const { deps, updatedAssets } = makeDeps(txn({ direction: "in" }));
    await deleteTransaction(deps, { profileId: "p1", transactionId: "t1" });
    expect(updatedAssets[0]!.currentValue.toCents()).toBe(70000n);
  });

  it("apagar agendado não mexe saldo, só some", async () => {
    const { deps, deleted, updatedAssets } = makeDeps(txn({ status: "scheduled" }));
    await deleteTransaction(deps, { profileId: "p1", transactionId: "t1" });
    expect(deleted).toEqual(["t1"]);
    expect(updatedAssets).toHaveLength(0);
  });

  it("erro quando não existe", async () => {
    const { deps } = makeDeps(null);
    const res = await deleteTransaction(deps, { profileId: "p1", transactionId: "x" });
    expect(isErr(res)).toBe(true);
  });
});
