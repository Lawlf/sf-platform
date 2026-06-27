import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { getAssetCost, type GetAssetCostDeps } from "./get-asset-cost.use-case";

function asset(over: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "carro",
    userId: "u1",
    profileId: "p1",
    category: "vehicle",
    label: "Carro",
    currentValue: Money.fromCents(5000000n),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "depreciating",
    depreciationRatePctYear: 10,
    purchaseDate: null,
    purchasePriceCents: null,
    monthlyCostEstimateCents: null,
    anchorAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...over,
  } as AssetEntity;
}

function txn(over: Partial<TransactionEntity> = {}): TransactionEntity {
  return {
    id: "t1",
    userId: "u1",
    profileId: "p1",
    direction: "out",
    amount: Money.fromCents(10000n),
    description: "Gasolina",
    category: "transporte",
    accountId: "acc1",
    assetId: "carro",
    occurredAt: new Date("2026-06-10T00:00:00Z"),
    status: "paid",
    excludedFromTotals: false,
    source: "manual",
    externalId: null,
    createdAt: new Date("2026-06-10T00:00:00Z"),
    deletedAt: null,
    ...over,
  };
}

function makeDeps(found: AssetEntity | null, txns: TransactionEntity[]): GetAssetCostDeps {
  return {
    transactions: { listByAttributedAsset: vi.fn(async () => txns) },
    assets: { findById: vi.fn(async () => found) },
    clock: { now: () => new Date("2026-06-15T00:00:00Z") },
  } as unknown as GetAssetCostDeps;
}

describe("getAssetCost", () => {
  it("agrega o custo do ativo a partir dos lançamentos atribuídos", async () => {
    const deps = makeDeps(asset(), [
      txn({ amount: Money.fromCents(30000n) }),
      txn({ amount: Money.fromCents(12000n), category: "manutencao" }),
    ]);
    const res = await getAssetCost(deps, { profileId: "p1", assetId: "carro" });
    expect(res).not.toBeNull();
    expect(res!.asset.label).toBe("Carro");
    expect(res!.cost.month.outCents).toBe(42000n);
  });

  it("retorna null quando o ativo não existe", async () => {
    const deps = makeDeps(null, []);
    const res = await getAssetCost(deps, { profileId: "p1", assetId: "x" });
    expect(res).toBeNull();
  });

  it("usa a data de compra do ativo para o recorte 'desde a compra'", async () => {
    const deps = makeDeps(asset({ purchaseDate: new Date("2024-01-01T00:00:00Z") }), [
      txn({ amount: Money.fromCents(10000n), occurredAt: new Date("2024-03-01T00:00:00Z") }),
      txn({ amount: Money.fromCents(20000n), occurredAt: new Date("2026-06-05T00:00:00Z") }),
    ]);
    const res = await getAssetCost(deps, { profileId: "p1", assetId: "carro" });
    expect(res!.cost.sincePurchase?.outCents).toBe(30000n);
    expect(res!.hasPurchaseDate).toBe(true);
  });
});
