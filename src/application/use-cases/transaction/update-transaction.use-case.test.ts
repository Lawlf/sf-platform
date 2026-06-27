import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { updateTransaction } from "./update-transaction.use-case";

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
  const updatedTxns: TransactionEntity[] = [];
  const updatedAssets: AssetEntity[] = [];
  return {
    updatedTxns,
    updatedAssets,
    deps: {
      transactions: {
        findByIdForProfile: vi.fn(async () => initial),
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
      },
      clock: { now: () => new Date("2026-06-21T00:00:00Z") },
    },
  };
}

describe("updateTransaction", () => {
  it("muda a categoria sem tocar saldo", async () => {
    const { deps, updatedTxns, updatedAssets } = makeDeps(txn());
    const res = await updateTransaction(deps, {
      profileId: "p1",
      transactionId: "t1",
      category: "alimentacao",
    });
    expect(isOk(res)).toBe(true);
    expect(updatedTxns[0]!.category).toBe("alimentacao");
    expect(updatedAssets).toHaveLength(0);
  });

  it("editar valor de saída paga reconcilia o saldo pela diferença", async () => {
    // Saída antiga 300, conta 1000. Novo valor 100 => devolve 200 => conta 1200.
    const { deps, updatedAssets } = makeDeps(txn({ amount: Money.fromCents(30000n) }));
    await updateTransaction(deps, {
      profileId: "p1",
      transactionId: "t1",
      category: null,
      amountCents: 10000n,
    });
    expect(updatedAssets[0]!.currentValue.toCents()).toBe(120000n);
  });

  it("editar valor de entrada paga ajusta o saldo no sentido certo", async () => {
    // Entrada antiga 300, conta 1000. Novo 500 => +200 => conta 1200.
    const { deps, updatedAssets } = makeDeps(
      txn({ direction: "in", amount: Money.fromCents(30000n) }),
    );
    await updateTransaction(deps, {
      profileId: "p1",
      transactionId: "t1",
      category: null,
      amountCents: 50000n,
    });
    expect(updatedAssets[0]!.currentValue.toCents()).toBe(120000n);
  });

  it("editar valor de agendado NÃO mexe saldo", async () => {
    const { deps, updatedAssets } = makeDeps(txn({ status: "scheduled" }));
    await updateTransaction(deps, {
      profileId: "p1",
      transactionId: "t1",
      category: null,
      amountCents: 10000n,
    });
    expect(updatedAssets).toHaveLength(0);
  });

  it("reatribui o ativo do lançamento sem tocar saldo", async () => {
    const { deps, updatedTxns, updatedAssets } = makeDeps(txn({ assetId: null }));
    const res = await updateTransaction(deps, {
      profileId: "p1",
      transactionId: "t1",
      category: null,
      assetId: "asset-apt",
    });
    expect(isOk(res)).toBe(true);
    expect(updatedTxns[0]!.assetId).toBe("asset-apt");
    expect(updatedAssets).toHaveLength(0);
  });

  it("assetId omitido preserva a atribuição existente", async () => {
    const { deps, updatedTxns } = makeDeps(txn({ assetId: "asset-carro" }));
    await updateTransaction(deps, {
      profileId: "p1",
      transactionId: "t1",
      category: "transporte",
    });
    expect(updatedTxns[0]!.assetId).toBe("asset-carro");
  });

  it("erro quando não existe", async () => {
    const { deps } = makeDeps(null);
    const res = await updateTransaction(deps, {
      profileId: "p1",
      transactionId: "x",
      category: null,
    });
    expect(isErr(res)).toBe(true);
  });
});
