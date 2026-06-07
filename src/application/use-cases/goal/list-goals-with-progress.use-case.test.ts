import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalEntity, GoalStatus } from "@/domain/entities/goal.entity";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepository } from "@/domain/ports/repositories/exchange-rate.repository";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepository } from "@/domain/ports/repositories/user-fx-override.repository";
import { Money, type Currency } from "@/domain/value-objects/money.vo";

import { listGoalsWithProgress } from "./list-goals-with-progress.use-case";

const NOW = new Date("2026-05-19T10:00:00Z");

function makeAsset(id: string, currentValueCents: bigint, currency: Currency = "BRL"): AssetEntity {
  return {
    id,
    userId: "user-1",
    category: "investment",
    label: "Ativo",
    currentValue: Money.fromCents(currentValueCents, currency),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

function makeSavingsGoal(linkedAssetId: string, targetCents: bigint): GoalEntity {
  return {
    id: "g1",
    userId: "user-1",
    type: "savings",
    title: "Reserva",
    status: "active",
    targetCents,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId,
    targetMonths: null,
    fundingMode: "linked",
    manualSavedCents: null,
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: null,
    cascadeMode: null,
    cascadeParallelPct: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

function buildDeps({
  goal,
  asset,
  rate = null,
}: {
  goal: GoalEntity;
  asset: AssetEntity;
  rate?: string | null;
}) {
  const assets: AssetRepository = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(async (id: string) => (id === asset.id ? asset : null)),
    findActiveByUser: vi.fn(async () => []),
    createDefaultWallet: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };

  const allocations: AssetDebtAllocationRepository = {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(async () => []),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };

  const debts: DebtRepository = {
    findById: vi.fn(),
    listForUser: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };

  const incomes: IncomeRepository = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    listForUser: vi.fn(async () => []),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  const goals: GoalRepository = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    listForUser: vi.fn(async (userId: string, opts?: { status?: GoalStatus }) => {
      if (goal.userId !== userId) return [];
      if (opts?.status && goal.status !== opts.status) return [];
      return [goal];
    }),
    setStatus: vi.fn(),
    countActiveForUser: vi.fn(async () => 1),
  } as unknown as GoalRepository;

  const rates: ExchangeRateRepository = {
    upsertDaily: vi.fn(),
    findLatest: vi.fn(async () => (rate ? ({ rateDecimal: rate, asOf: NOW } as never) : null)),
  };

  const overrides: UserFxOverrideRepository = {
    find: vi.fn(async () => null),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(async () => []),
  };

  const clock = { now: vi.fn(() => NOW) };

  return { assets, allocations, debts, incomes, goals, clock, rates, overrides };
}

describe("listGoalsWithProgress", () => {
  it("converte o ativo vinculado em moeda estrangeira para manualSavedCents na base", async () => {
    const asset = makeAsset("a1", 100_000n, "USD");
    const goal = makeSavingsGoal("a1", 1_000_000n);
    const deps = buildDeps({ goal, asset, rate: "5.00" });

    const result = await listGoalsWithProgress(deps, { userId: "user-1", isPro: true });

    expect(result).toHaveLength(1);
    expect(result[0]?.progress.currentCents).toBe(500_000n);
  });

  it("mantem ativo vinculado em BRL inalterado", async () => {
    const asset = makeAsset("a1", 100_000n, "BRL");
    const goal = makeSavingsGoal("a1", 1_000_000n);
    const deps = buildDeps({ goal, asset });

    const result = await listGoalsWithProgress(deps, { userId: "user-1", isPro: true });

    expect(result[0]?.progress.currentCents).toBe(100_000n);
  });
});
