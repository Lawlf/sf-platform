import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { assemblePlanningView } from "./assemble-planning-view";

const NOW = new Date("2026-05-25T00:00:00Z");

const m = (r: number) => {
  const x = Money.from(r);
  if (!isOk(x)) throw new Error("m");
  return x.value;
};
const mUsd = (r: number) => {
  const x = Money.from(r, "USD");
  if (!isOk(x)) throw new Error("mUsd");
  return x.value;
};
const rate = (d: number) => {
  const x = InterestRate.fromMonthly(d);
  if (!isOk(x)) throw new Error("r");
  return x.value;
};

const fxDeps = (rateDecimal: string | null) => ({
  rates: {
    upsertDaily: vi.fn(),
    findLatest: vi.fn().mockResolvedValue(rateDecimal ? { rateDecimal, asOf: NOW } : null),
  },
  overrides: {
    find: vi.fn().mockResolvedValue(null),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(),
  },
  clock: { now: vi.fn(() => NOW) },
});

function goal(p: Partial<GoalEntity> & Pick<GoalEntity, "type">): GoalEntity {
  return {
    id: "g1", userId: "u1", profileId: "profile-1", title: "g", status: "active",
    targetCents: null, deadline: null, linkedDebtId: null, linkedAssetId: null,
    targetMonths: null, fundingMode: null, manualSavedCents: null, monthlyCostCents: null,
    realReturnPct: null, cascadeOrder: null, cascadeMode: null, cascadeParallelPct: null,
    createdAt: new Date(0), updatedAt: new Date(0), ...p,
  };
}

const MACRO: GoalMacro = {
  investedCents: 0n, cashReserveCents: 0n, contributionCents: 200000n,
  monthlyServiceCents: 0n, monthlyIncomeCents: 500000n, debts: [],
};

const baseArgs = {
  goals: [] as GoalEntity[],
  macro: MACRO,
  assets: [] as AssetEntity[],
  debts: [] as DebtEntity[],
  liquidBucketAssetId: null,
  monthlyFreeCashFlowCents: 200000n,
  horizonMonths: 12,
};

describe("assemblePlanningView", () => {
  it("runs the cascade and the projection over the same free cash flow", async () => {
    const g = goal({ type: "savings", targetCents: 800000n, manualSavedCents: 0n });
    const r = await assemblePlanningView(fxDeps(null), {
      ...baseArgs,
      userId: "u1",
      goals: [g],
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const view = r.value;

    expect(view.cascade.goals[0]!.etaMonth).toBe(4);
    expect(view.projection.points).toHaveLength(12);
    expect(view.projection.points[0]!.netWorthCents).toBe(200000n);
    expect(view.projection.points[11]!.netWorthCents).toBe(2400000n);
  });

  it("returns empty cascade goals and a flat projection when there is nothing", async () => {
    const r = await assemblePlanningView(fxDeps(null), {
      ...baseArgs,
      userId: "u1",
      macro: { ...MACRO, contributionCents: 0n },
      monthlyFreeCashFlowCents: 0n,
      horizonMonths: 6,
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    const view = r.value;
    expect(view.cascade.goals).toEqual([]);
    expect(view.projection.points).toHaveLength(6);
    expect(view.projection.points[5]!.netWorthCents).toBe(0n);
  });

  it("converts a foreign asset to base before feeding the projection inputs", async () => {
    const usdAsset = {
      id: "aUsd", userId: "u1", category: "cash", label: "USD",
      currentValue: mUsd(1000), depreciationRatePctYear: 0, metadata: null,
      createdAt: NOW, deletedAt: null,
    } as unknown as AssetEntity;

    const r = await assemblePlanningView(fxDeps("5.00"), {
      ...baseArgs,
      userId: "u1",
      macro: { ...MACRO, contributionCents: 0n },
      assets: [usdAsset],
      monthlyFreeCashFlowCents: 0n,
      horizonMonths: 1,
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.projection.points[0]!.netWorthCents).toBe(500000n);
  });

  it("converts a foreign debt to base before feeding the projection inputs", async () => {
    const usdDebt = {
      id: "dUsd", userId: "u1", label: "USD overdraft", kind: "overdraft", status: "active",
      bankName: "Bank", currentBalance: mUsd(1000), originalPrincipal: mUsd(1000),
      monthlyRate: rate(0), lastChargeDate: null, startDate: NOW, expectedEndDate: null,
      createdAt: NOW, deletedAt: null,
    } as unknown as DebtEntity;

    const r = await assemblePlanningView(fxDeps("5.00"), {
      ...baseArgs,
      userId: "u1",
      macro: { ...MACRO, contributionCents: 0n },
      debts: [usdDebt],
      monthlyFreeCashFlowCents: 0n,
      horizonMonths: 1,
    });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.projection.points[0]!.netWorthCents).toBe(-500000n);
  });

  it("returns the FX error when a foreign entity has no rate", async () => {
    const usdAsset = {
      id: "aUsd", userId: "u1", category: "cash", label: "USD",
      currentValue: mUsd(1000), depreciationRatePctYear: 0, metadata: null,
      createdAt: NOW, deletedAt: null,
    } as unknown as AssetEntity;

    const r = await assemblePlanningView(fxDeps(null), {
      ...baseArgs,
      userId: "u1",
      assets: [usdAsset],
    });
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error).toBeInstanceOf(FxRateUnavailableError);
  });
});
