import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { addToReserve } from "./add-to-reserve.use-case";

function makeGoal(overrides: Partial<GoalEntity> = {}): GoalEntity {
  return {
    id: "g1",
    userId: "u1",
    type: "emergency_fund",
    title: "Reserva",
    status: "active",
    targetCents: null,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: 6,
    fundingMode: null,
    manualSavedCents: null,
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: null,
    cascadeMode: null,
    cascadeParallelPct: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCashAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "a1",
    userId: "u1",
    category: "cash",
    label: "Reserva de emergência",
    currentValue: Money.fromCents(50000n),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    ...overrides,
  };
}

interface Fakes {
  goals: GoalRepository;
  assets: AssetRepository;
  goalStore: Map<string, GoalEntity>;
  assetStore: Map<string, AssetEntity>;
  updatedGoalPatches: Array<{ id: string; patch: Partial<GoalEntity> }>;
}

function makeFakes(goal: GoalEntity, asset?: AssetEntity): Fakes {
  const goalStore = new Map<string, GoalEntity>([[goal.id, goal]]);
  const assetStore = new Map<string, AssetEntity>();
  if (asset) assetStore.set(asset.id, asset);
  const updatedGoalPatches: Array<{ id: string; patch: Partial<GoalEntity> }> = [];

  const goals = {
    findById: async (id: string) => goalStore.get(id) ?? null,
    update: async (id: string, patch: Partial<GoalEntity>) => {
      const existing = goalStore.get(id);
      if (!existing) return null;
      const next = { ...existing, ...patch, updatedAt: new Date() };
      goalStore.set(id, next);
      updatedGoalPatches.push({ id, patch });
      return next;
    },
  } as unknown as GoalRepository;

  const assets = {
    findById: async (id: string, userId: string) => {
      const a = assetStore.get(id);
      if (!a || a.userId !== userId) return null;
      return a;
    },
    create: async (a: AssetEntity) => {
      assetStore.set(a.id, a);
    },
    update: async (a: AssetEntity) => {
      assetStore.set(a.id, a);
    },
  } as unknown as AssetRepository;

  return { goals, assets, goalStore, assetStore, updatedGoalPatches };
}

describe("addToReserve", () => {
  it("cria ativo cash e vincula quando a meta nao tem linkedAssetId", async () => {
    const goal = makeGoal({ linkedAssetId: null });
    const f = makeFakes(goal);

    const r = await addToReserve(
      { goals: f.goals, assets: f.assets },
      { userId: "u1", goalId: "g1", amountCents: 30000n },
    );

    expect(r.ok).toBe(true);
    expect(f.assetStore.size).toBe(1);
    const created = [...f.assetStore.values()][0];
    expect(created).toBeDefined();
    expect(created!.category).toBe("cash");
    expect(created!.label).toBe("Reserva de emergência");
    expect(created!.currentValue.toCents()).toBe(30000n);
    expect(created!.metadata).toEqual({ kind: "cash", yieldType: "none" });
    expect(f.updatedGoalPatches).toHaveLength(1);
    expect(f.updatedGoalPatches[0]!.patch.linkedAssetId).toBe(created!.id);
  });

  it("incrementa currentValue do ativo cash existente vinculado", async () => {
    const asset = makeCashAsset({ id: "a1", currentValue: Money.fromCents(50000n) });
    const goal = makeGoal({ linkedAssetId: "a1" });
    const f = makeFakes(goal, asset);

    const r = await addToReserve(
      { goals: f.goals, assets: f.assets },
      { userId: "u1", goalId: "g1", amountCents: 25000n },
    );

    expect(r.ok).toBe(true);
    expect(f.assetStore.get("a1")!.currentValue.toCents()).toBe(75000n);
    expect(f.updatedGoalPatches).toHaveLength(0);
  });

  it("cria novo ativo quando linkedAssetId aponta para ativo nao-cash", async () => {
    const asset = makeCashAsset({ id: "a1", category: "investment", metadata: null });
    const goal = makeGoal({ linkedAssetId: "a1" });
    const f = makeFakes(goal, asset);

    const r = await addToReserve(
      { goals: f.goals, assets: f.assets },
      { userId: "u1", goalId: "g1", amountCents: 10000n },
    );

    expect(r.ok).toBe(true);
    expect(f.assetStore.size).toBe(2);
    expect(f.updatedGoalPatches).toHaveLength(1);
  });

  it("rejeita meta de outro usuario", async () => {
    const goal = makeGoal({ userId: "outro" });
    const f = makeFakes(goal);

    const r = await addToReserve(
      { goals: f.goals, assets: f.assets },
      { userId: "u1", goalId: "g1", amountCents: 10000n },
    );

    expect(r.ok).toBe(false);
    expect(f.assetStore.size).toBe(0);
  });

  it("rejeita meta inexistente", async () => {
    const goal = makeGoal();
    const f = makeFakes(goal);

    const r = await addToReserve(
      { goals: f.goals, assets: f.assets },
      { userId: "u1", goalId: "naoexiste", amountCents: 10000n },
    );

    expect(r.ok).toBe(false);
  });

  it("rejeita valor menor ou igual a zero", async () => {
    const goal = makeGoal();
    const f = makeFakes(goal);

    const zero = await addToReserve(
      { goals: f.goals, assets: f.assets },
      { userId: "u1", goalId: "g1", amountCents: 0n },
    );
    expect(zero.ok).toBe(false);

    const negative = await addToReserve(
      { goals: f.goals, assets: f.assets },
      { userId: "u1", goalId: "g1", amountCents: -100n },
    );
    expect(negative.ok).toBe(false);
  });
});
