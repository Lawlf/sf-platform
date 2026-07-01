import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { Money, type Currency } from "@/domain/value-objects/money.vo";

import { resolveGoalProgressInputs } from "./resolve-goal-progress-inputs";

const NOW = new Date("2026-05-19T10:00:00Z");

function makeAsset(id: string, currentValueCents: bigint, currency: Currency = "BRL"): AssetEntity {
  return {
    id,
    userId: "user-1",
    profileId: "profile-1",
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

function makeGoal(overrides: Partial<GoalEntity>): GoalEntity {
  return {
    id: "g1",
    userId: "user-1",
    profileId: "profile-1",
    householdId: null,
    type: "savings",
    title: "Meta",
    status: "active",
    targetCents: 1_000_000n,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: null,
    fundingMode: null,
    manualSavedCents: null,
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: null,
    cascadeMode: null,
    cascadeParallelPct: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

const BASE_MACRO: GoalMacro = {
  investedCents: 0n,
  cashReserveCents: 500_000n,
  contributionCents: 0n,
  monthlyServiceCents: 0n,
  monthlyIncomeCents: 0n,
  debts: [],
};

function buildDeps({ asset, rate = null }: { asset: AssetEntity | null; rate?: string | null }) {
  const assets: AssetRepositoryPort = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(async (id: string) => (asset && id === asset.id ? asset : null)),
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

  const clock = {
    now: () => NOW,
  };

  return { assets, rates, overrides, clock };
}

describe("resolveGoalProgressInputs", () => {
  it("savings linked: injeta saldo do ativo (BRL) em manualSavedCents", async () => {
    const asset = makeAsset("a1", 300_000n, "BRL");
    const goal = makeGoal({ type: "savings", fundingMode: "linked", linkedAssetId: "a1" });
    const deps = buildDeps({ asset });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.goal.manualSavedCents).toBe(300_000n);
    expect(result.macro).toBe(BASE_MACRO);
  });

  it("savings linked: converte moeda estrangeira antes de injetar", async () => {
    const asset = makeAsset("a1", 100_000n, "USD");
    const goal = makeGoal({ type: "savings", fundingMode: "linked", linkedAssetId: "a1" });
    const deps = buildDeps({ asset, rate: "5.00" });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.goal.manualSavedCents).toBe(500_000n);
  });

  it("savings linked: ativo nao encontrado mantem goal/macro inalterados", async () => {
    const goal = makeGoal({ type: "savings", fundingMode: "linked", linkedAssetId: "missing" });
    const deps = buildDeps({ asset: null });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.goal).toBe(goal);
    expect(result.macro).toBe(BASE_MACRO);
  });

  it("emergency_fund vinculado: substitui cashReserveCents pelo saldo do ativo (BRL)", async () => {
    const asset = makeAsset("a1", 700_000n, "BRL");
    const goal = makeGoal({
      type: "emergency_fund",
      linkedAssetId: "a1",
      monthlyCostCents: 100_000n,
      targetMonths: 6,
    });
    const deps = buildDeps({ asset });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.macro.cashReserveCents).toBe(700_000n);
    expect(result.goal).toBe(goal);
  });

  it("emergency_fund vinculado: converte moeda estrangeira antes de substituir", async () => {
    const asset = makeAsset("a1", 100_000n, "USD");
    const goal = makeGoal({
      type: "emergency_fund",
      linkedAssetId: "a1",
      monthlyCostCents: 100_000n,
      targetMonths: 6,
    });
    const deps = buildDeps({ asset, rate: "5.00" });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.macro.cashReserveCents).toBe(500_000n);
  });

  it("emergency_fund vinculado: ativo nao encontrado mantem macro agregado", async () => {
    const goal = makeGoal({ type: "emergency_fund", linkedAssetId: "missing", monthlyCostCents: 100_000n });
    const deps = buildDeps({ asset: null });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.macro).toBe(BASE_MACRO);
  });

  it("emergency_fund sem vinculo: passa direto (agregado inalterado)", async () => {
    const goal = makeGoal({ type: "emergency_fund", linkedAssetId: null, monthlyCostCents: 100_000n });
    const deps = buildDeps({ asset: null });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.goal).toBe(goal);
    expect(result.macro).toBe(BASE_MACRO);
  });

  it("debt_payoff: nunca mexe (passa direto)", async () => {
    const goal = makeGoal({ type: "debt_payoff", linkedDebtId: "d1" });
    const deps = buildDeps({ asset: null });

    const result = await resolveGoalProgressInputs(deps, goal, BASE_MACRO, "profile-1");

    expect(result.goal).toBe(goal);
    expect(result.macro).toBe(BASE_MACRO);
  });
});
