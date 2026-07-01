import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalSnapshotRepositoryPort } from "@/domain/ports/repositories/goal-snapshot.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import { Money, type Currency } from "@/domain/value-objects/money.vo";

import { getGoalDetail } from "./get-goal-detail.use-case";

const NOW = new Date("2026-05-19T10:00:00Z");

function makeAsset(id: string, currentValueCents: bigint, currency: Currency = "BRL"): AssetEntity {
  return {
    id,
    userId: "user-1",
    profileId: "profile-1",
    category: "cash",
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
    monthlyCostEstimateCents: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

function makeEmergencyFundGoal(linkedAssetId: string | null): GoalEntity {
  return {
    id: "g1",
    userId: "user-1",
    profileId: "profile-1",
    householdId: null,
    type: "emergency_fund",
    title: "Reserva de emergência",
    status: "active",
    targetCents: null,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId,
    targetMonths: 6,
    fundingMode: null,
    manualSavedCents: null,
    monthlyCostCents: 100_000n,
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
  const assets: AssetRepositoryPort = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(async (id: string) => (id === asset.id ? asset : null)),
    findActiveByProfile: vi.fn(async () => []),
    createDefaultWallet: vi.fn(),
    findActiveByProfileAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForProfile: vi.fn(async () => []),
    listCryptoTickersForProfile: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };

  const allocations: AssetDebtAllocationRepositoryPort = {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(async () => []),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };

  const debts: DebtRepositoryPort = {
    findById: vi.fn(),
    listForProfile: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };

  const incomes: IncomeRepositoryPort = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    listForProfile: vi.fn(async () => []),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  const goals: GoalRepositoryPort = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(async (id: string) => (id === goal.id ? goal : null)),
    listForProfile: vi.fn(async () => []),
    listForHousehold: vi.fn(async () => []),
    findByIdInHousehold: vi.fn(),
    countActive: vi.fn(async () => 1),
    softDelete: vi.fn(),
    restore: vi.fn(),
    listAllActive: vi.fn(async () => []),
  };

  const snapshots: GoalSnapshotRepositoryPort = {
    upsert: vi.fn(),
    listForGoal: vi.fn(async (): Promise<GoalSnapshotEntity[]> => []),
  };

  const contributions: GoalContributionRepositoryPort = {
    add: vi.fn(),
    listForGoal: vi.fn(async (): Promise<GoalContributionEntity[]> => []),
  };

  const rates: ExchangeRateRepositoryPort = {
    upsertDaily: vi.fn(),
    findLatest: vi.fn(async () => (rate ? ({ rateDecimal: rate, asOf: NOW } as never) : null)),
  };

  const overrides: UserFxOverrideRepositoryPort = {
    find: vi.fn(async () => null),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(async () => []),
  };

  const clock = { now: vi.fn(() => NOW) };

  return { assets, allocations, debts, incomes, goals, snapshots, contributions, clock, rates, overrides };
}

describe("getGoalDetail", () => {
  it("emergency_fund vinculado: usa saldo do ativo em vez do cash agregado", async () => {
    const asset = makeAsset("a1", 700_000n, "BRL");
    const goal = makeEmergencyFundGoal("a1");
    const deps = buildDeps({ goal, asset });

    const result = await getGoalDetail(deps, {
      userId: "user-1",
      profileId: "profile-1",
      goalId: "g1",
      isPro: true,
    });

    expect(result?.progress.currentCents).toBe(700_000n);
  });

  it("emergency_fund vinculado: converte moeda estrangeira do ativo", async () => {
    const asset = makeAsset("a1", 100_000n, "USD");
    const goal = makeEmergencyFundGoal("a1");
    const deps = buildDeps({ goal, asset, rate: "5.00" });

    const result = await getGoalDetail(deps, {
      userId: "user-1",
      profileId: "profile-1",
      goalId: "g1",
      isPro: true,
    });

    expect(result?.progress.currentCents).toBe(500_000n);
  });

  it("retorna null quando a meta nao pertence ao profile", async () => {
    const asset = makeAsset("a1", 700_000n, "BRL");
    const goal = makeEmergencyFundGoal("a1");
    const deps = buildDeps({ goal, asset });

    const result = await getGoalDetail(deps, {
      userId: "user-1",
      profileId: "other-profile",
      goalId: "g1",
      isPro: true,
    });

    expect(result).toBeNull();
  });
});
