import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { Money } from "@/domain/value-objects/money.vo";

import { recordContribution, type RecordContributionDeps } from "./record-contribution.use-case";

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
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...overrides,
  };
}

const MACRO: GoalMacro = {
  investedCents: 0n,
  cashReserveCents: 0n,
  contributionCents: 0n,
  monthlyServiceCents: 0n,
  monthlyIncomeCents: 800000n,
  debts: [],
};

interface Harness {
  deps: RecordContributionDeps;
  goalStore: Map<string, GoalEntity>;
  assetStore: Map<string, AssetEntity>;
  contributions: GoalContributionEntity[];
  snapshots: GoalSnapshotEntity[];
  idSeq: { n: number };
}

function makeHarness(
  goal: GoalEntity,
  asset?: AssetEntity,
  opts: { snapshotThrows?: boolean } = {},
): Harness {
  const goalStore = new Map<string, GoalEntity>([[goal.id, goal]]);
  const assetStore = new Map<string, AssetEntity>();
  if (asset) assetStore.set(asset.id, asset);
  const contributions: GoalContributionEntity[] = [];
  const snapshots: GoalSnapshotEntity[] = [];
  const idSeq = { n: 0 };

  const deps: RecordContributionDeps = {
    goals: {
      findById: async (id: string) => goalStore.get(id) ?? null,
      update: async (id: string, patch) => {
        const existing = goalStore.get(id);
        if (!existing) return null;
        const next = { ...existing, ...patch, updatedAt: new Date() };
        goalStore.set(id, next);
        return next;
      },
    },
    assets: {
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
    },
    contributions: {
      add: async (c: GoalContributionEntity) => {
        contributions.push(c);
      },
    },
    snapshots: {
      upsert: async (s: GoalSnapshotEntity) => {
        if (opts.snapshotThrows) throw new Error("boom");
        snapshots.push(s);
      },
    },
    buildMacro: async () => MACRO,
    clock: { now: () => new Date("2026-06-15T12:00:00.000Z") },
    newId: () => `new-${++idSeq.n}`,
  };

  return { deps, goalStore, assetStore, contributions, snapshots, idSeq };
}

describe("recordContribution", () => {
  it("reserva: incrementa o ativo cash existente, grava aporte e snapshot do mes", async () => {
    const asset = makeCashAsset({ id: "a1", currentValue: Money.fromCents(50000n) });
    const goal = makeGoal({ linkedAssetId: "a1" });
    const h = makeHarness(goal, asset);

    const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 25000n });

    expect(r.ok).toBe(true);
    expect(h.assetStore.get("a1")!.currentValue.toCents()).toBe(75000n);
    expect(h.contributions).toHaveLength(1);
    expect(h.contributions[0]!.amountCents).toBe(25000n);
    expect(h.snapshots).toHaveLength(1);
    expect(h.snapshots[0]!.month.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("reserva: cria ativo cash e vincula quando nao existe", async () => {
    const goal = makeGoal({ linkedAssetId: null });
    const h = makeHarness(goal);

    const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 30000n });

    expect(r.ok).toBe(true);
    expect(h.assetStore.size).toBe(1);
    const created = [...h.assetStore.values()][0]!;
    expect(created.category).toBe("cash");
    expect(created.currentValue.toCents()).toBe(30000n);
    expect(h.goalStore.get("g1")!.linkedAssetId).toBe(created.id);
    expect(h.contributions).toHaveLength(1);
  });

  it("savings manual: incrementa manualSavedCents", async () => {
    const goal = makeGoal({
      type: "savings",
      fundingMode: "manual",
      manualSavedCents: 10000n,
      targetCents: 50000n,
    });
    const h = makeHarness(goal);

    const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 15000n });

    expect(r.ok).toBe(true);
    expect(h.goalStore.get("g1")!.manualSavedCents).toBe(25000n);
    expect(h.contributions).toHaveLength(1);
    expect(h.snapshots).toHaveLength(1);
  });

  it("savings manual sem manualSavedCents inicial trata como zero", async () => {
    const goal = makeGoal({ type: "savings", fundingMode: "manual", manualSavedCents: null, targetCents: 50000n });
    const h = makeHarness(goal);

    const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 15000n });

    expect(r.ok).toBe(true);
    expect(h.goalStore.get("g1")!.manualSavedCents).toBe(15000n);
  });

  it("rejeita savings linked", async () => {
    const goal = makeGoal({ type: "savings", fundingMode: "linked", linkedAssetId: "a1" });
    const h = makeHarness(goal);

    const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 15000n });

    expect(r.ok).toBe(false);
    expect(h.contributions).toHaveLength(0);
  });

  it("rejeita financial_independence e debt_payoff", async () => {
    for (const type of ["financial_independence", "debt_payoff"] as const) {
      const h = makeHarness(makeGoal({ type }));
      const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 15000n });
      expect(r.ok).toBe(false);
      expect(h.contributions).toHaveLength(0);
    }
  });

  it("rejeita valor <= 0", async () => {
    const h = makeHarness(makeGoal());
    const zero = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 0n });
    const neg = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: -1n });
    expect(zero.ok).toBe(false);
    expect(neg.ok).toBe(false);
    expect(h.contributions).toHaveLength(0);
  });

  it("rejeita meta de outro dono", async () => {
    const h = makeHarness(makeGoal({ userId: "outro" }));
    const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 15000n });
    expect(r.ok).toBe(false);
  });

  it("falha no upsert de snapshot nao derruba o aporte", async () => {
    const asset = makeCashAsset({ id: "a1", currentValue: Money.fromCents(50000n) });
    const goal = makeGoal({ linkedAssetId: "a1" });
    const h = makeHarness(goal, asset, { snapshotThrows: true });

    const r = await recordContribution(h.deps, { userId: "u1", goalId: "g1", amountCents: 25000n });

    expect(r.ok).toBe(true);
    expect(h.contributions).toHaveLength(1);
    expect(h.assetStore.get("a1")!.currentValue.toCents()).toBe(75000n);
    expect(h.snapshots).toHaveLength(0);
  });
});
