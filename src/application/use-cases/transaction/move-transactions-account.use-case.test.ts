import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { moveTransactionsAccount } from "./move-transactions-account.use-case";

function cashAsset(id: string, cents: bigint): AssetEntity {
  return {
    id,
    userId: "u1",
    profileId: "p1",
    category: "cash",
    label: id,
    currentValue: Money.fromCents(cents),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    anchorAt: null,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
  } as AssetEntity;
}

function txn(over: Partial<TransactionEntity> = {}): TransactionEntity {
  return {
    id: "t1",
    userId: "u1",
    profileId: "p1",
    direction: "out",
    amount: Money.fromCents(30000n),
    description: "x",
    category: null,
    accountId: "A",
    assetId: null,
    occurredAt: new Date("2026-06-10"),
    status: "paid",
    excludedFromTotals: false,
    source: "manual",
    externalId: null,
    createdAt: new Date("2026-06-10"),
    deletedAt: null,
    ...over,
  };
}

function makeDeps(txns: TransactionEntity[], accounts: AssetEntity[]) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const txById = new Map(txns.map((t) => [t.id, t]));
  const updatedAccounts: AssetEntity[] = [];
  const updatedTxns: TransactionEntity[] = [];
  return {
    updatedAccounts,
    updatedTxns,
    deps: {
      transactions: {
        findByIdForProfile: vi.fn(async (id: string) => txById.get(id) ?? null),
        update: vi.fn(async (t: TransactionEntity) => {
          updatedTxns.push(t);
          return t;
        }),
      },
      assets: {
        findById: vi.fn(async (id: string) => byId.get(id) ?? null),
        update: vi.fn(async (a: AssetEntity) => {
          updatedAccounts.push(a);
        }),
      },
      clock: { now: () => new Date("2026-06-21") },
    },
  };
}

describe("moveTransactionsAccount", () => {
  it("mover saída paga devolve pra antiga e tira da nova", async () => {
    // A=1000, B=1000, saída 300 que estava em A. Mover pra B: A volta 1300, B vira 700.
    const { deps, updatedAccounts, updatedTxns } = makeDeps(
      [txn({ id: "t1", accountId: "A" })],
      [cashAsset("A", 100000n), cashAsset("B", 100000n)],
    );
    const res = await moveTransactionsAccount(deps, {
      profileId: "p1",
      transactionIds: ["t1"],
      targetAccountId: "B",
    });
    expect(isOk(res) && res.value.count).toBe(1);
    expect(updatedTxns[0]!.accountId).toBe("B");
    const a = updatedAccounts.find((x) => x.id === "A")!;
    const b = updatedAccounts.find((x) => x.id === "B")!;
    expect(a.currentValue.toCents()).toBe(130000n);
    expect(b.currentValue.toCents()).toBe(70000n);
  });

  it("agendado só troca de conta, não mexe saldo", async () => {
    const { deps, updatedAccounts, updatedTxns } = makeDeps(
      [txn({ id: "t1", accountId: "A", status: "scheduled" })],
      [cashAsset("A", 100000n), cashAsset("B", 100000n)],
    );
    await moveTransactionsAccount(deps, {
      profileId: "p1",
      transactionIds: ["t1"],
      targetAccountId: "B",
    });
    expect(updatedTxns[0]!.accountId).toBe("B");
    expect(updatedAccounts).toHaveLength(0);
  });

  it("conta destino inválida: Forbidden", async () => {
    const { deps } = makeDeps([txn()], [cashAsset("A", 100000n)]);
    const res = await moveTransactionsAccount(deps, {
      profileId: "p1",
      transactionIds: ["t1"],
      targetAccountId: "ZZZ",
    });
    expect(isErr(res)).toBe(true);
  });
});
