import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { Money } from "@/domain/value-objects/money.vo";

import {
  registerLoanCashInflow,
  type RegisterLoanCashInflowDeps,
} from "./register-loan-cash-inflow.action";

function makeAllocationsRepo(): AssetDebtAllocationRepository {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(async () => []),
    findByDebt: vi.fn(async () => []),
    sumAllocationsByDebt: vi.fn(async () => Money.zero()),
  };
}

function makeDebtRepo(): DebtRepository {
  return {
    findById: vi.fn(async () => null),
    listForUser: vi.fn(async () => []),
    create: vi.fn(async (e) => e),
    update: vi.fn(async (e) => e),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };
}

function makeAssetRepoWithStore(seed: AssetEntity[] = []): AssetRepository {
  const store = new Map<string, AssetEntity>();
  for (const a of seed) store.set(a.id, a);
  return {
    create: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    update: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    findById: vi.fn(async (id: string, userId: string) => {
      const a = store.get(id);
      if (!a || a.userId !== userId) return null;
      return a;
    }),
    findActiveByUser: vi.fn(async () => []),
    findActiveByUserAndCategory: vi.fn(async () => []),
    findByIdWithAllocations: vi.fn(async () => null),
    findActiveWithAllocations: vi.fn(async () => []),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-21T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeDeps(seed: AssetEntity[] = []): RegisterLoanCashInflowDeps {
  return {
    assets: makeAssetRepoWithStore(seed),
    allocations: makeAllocationsRepo(),
    debts: makeDebtRepo(),
    clock: makeClock(),
  };
}

function makeCashAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "cash-1",
    userId: "user-1",
    category: "cash",
    label: "Nubank",
    currentValue: Money.fromCents(500_000n),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("registerLoanCashInflow", () => {
  // cashTarget === "spent": nenhum asset tocado
  it("cashTarget=spent returns ok and touches no assets", async () => {
    const deps = makeDeps();
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "spent",
      principalCents: 1_250_000n,
    });
    expect(result.ok).toBe(true);
    expect(deps.assets.create).not.toHaveBeenCalled();
    expect(deps.assets.update).not.toHaveBeenCalled();
  });

  // cashTarget === "existing": bumpa saldo do cash asset
  it("cashTarget=existing bumps cash asset balance by principalCents", async () => {
    const cash = makeCashAsset({ currentValue: Money.fromCents(500_000n) });
    const deps = makeDeps([cash]);
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "existing",
      existingCashAssetId: "cash-1",
      principalCents: 1_250_000n,
    });
    expect(result.ok).toBe(true);
    expect(deps.assets.update).toHaveBeenCalledTimes(1);
    const updatedArg = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(updatedArg?.currentValue.toCents()).toBe(1_750_000n); // 500k + 1250k
  });

  it("cashTarget=existing with asset not found returns error", async () => {
    const deps = makeDeps(); // store vazio
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "existing",
      existingCashAssetId: "cash-1",
      principalCents: 1_250_000n,
    });
    expect(result.ok).toBe(false);
  });

  it("cashTarget=existing with asset belonging to another user returns error", async () => {
    const cash = makeCashAsset({ userId: "user-2" });
    const deps = makeDeps([cash]);
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "existing",
      existingCashAssetId: "cash-1",
      principalCents: 1_250_000n,
    });
    // findById returns null quando userId nao bate (comportamento do makeAssetRepoWithStore)
    expect(result.ok).toBe(false);
  });

  it("cashTarget=existing with missing existingCashAssetId returns validation error", async () => {
    const deps = makeDeps();
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "existing",
      // existingCashAssetId omitido
      principalCents: 1_250_000n,
    });
    expect(result.ok).toBe(false);
  });

  // cashTarget === "new": cria cash asset com saldo = balanceAntes + principal
  it("cashTarget=new creates cash asset with balance = newCashAssetCurrentBalanceCents + principalCents", async () => {
    const deps = makeDeps();
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "new",
      newCashAssetName: "Conta corrente",
      newCashAssetCurrentBalanceCents: 200_000n, // R$ 2.000 antes do emprestimo
      principalCents: 1_250_000n, // R$ 12.500 recebido
    });
    expect(result.ok).toBe(true);
    expect(deps.assets.create).toHaveBeenCalledTimes(1);
    const createdArg = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdArg?.currentValue.toCents()).toBe(1_450_000n); // 200k + 1250k
    expect(createdArg?.category).toBe("cash");
    expect(createdArg?.label).toBe("Conta corrente");
    expect(createdArg?.userId).toBe("user-1");
  });

  it("cashTarget=new with newCashAssetCurrentBalanceCents=0 creates asset with balance=principalCents", async () => {
    const deps = makeDeps();
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "new",
      newCashAssetName: "Nubank",
      newCashAssetCurrentBalanceCents: 0n,
      principalCents: 1_250_000n,
    });
    expect(result.ok).toBe(true);
    const createdArg = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdArg?.currentValue.toCents()).toBe(1_250_000n);
  });

  it("cashTarget=new with missing newCashAssetName returns validation error", async () => {
    const deps = makeDeps();
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "new",
      newCashAssetName: "   ",
      newCashAssetCurrentBalanceCents: 0n,
      principalCents: 1_250_000n,
    });
    expect(result.ok).toBe(false);
    expect(deps.assets.create).not.toHaveBeenCalled();
  });

  it("cashTarget=new with undefined newCashAssetCurrentBalanceCents defaults to principalCents only", async () => {
    const deps = makeDeps();
    const result = await registerLoanCashInflow(deps, {
      userId: "user-1",
      cashTarget: "new",
      newCashAssetName: "Conta",
      // newCashAssetCurrentBalanceCents omitido -> defaults to 0n
      principalCents: 1_000_000n,
    });
    expect(result.ok).toBe(true);
    const createdArg = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdArg?.currentValue.toCents()).toBe(1_000_000n);
  });
});
