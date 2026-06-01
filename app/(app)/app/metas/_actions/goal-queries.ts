"use server";

import { getGoalDetail } from "@/application/use-cases/goal/get-goal-detail.use-case";
import { listGoalsWithProgress } from "@/application/use-cases/goal/list-goals-with-progress.use-case";
import { filterByLinkedAsset, filterByLinkedDebt } from "./linked-goals";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleGoalSnapshotRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal-snapshot.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export interface SerializedGoalProgress {
  currentCents: string;
  targetCents: string;
  pct: number;
  reached: boolean;
  etaMonths: number | null;
  needsAttention: boolean;
}

export interface SerializedGoal {
  id: string;
  type: string;
  title: string;
  status: string;
  targetCents: string | null;
  deadlineIso: string | null;
  linkedDebtId: string | null;
  linkedAssetId: string | null;
  targetMonths: number | null;
  fundingMode: string | null;
  manualSavedCents: string | null;
  monthlyCostCents: string | null;
  realReturnPct: number | null;
}

export interface SerializedGoalWithProgress {
  goal: SerializedGoal;
  progress: SerializedGoalProgress;
  etaLocked: boolean;
}

export interface SerializedGoalSnapshot {
  monthIso: string;
  currentCents: string;
  targetCents: string;
}

export interface SerializedGoalDetail extends SerializedGoalWithProgress {
  snapshots: SerializedGoalSnapshot[];
}

function serializeGoal(goal: {
  id: string;
  type: string;
  title: string;
  status: string;
  targetCents: bigint | null;
  deadline: Date | null;
  linkedDebtId: string | null;
  linkedAssetId: string | null;
  targetMonths: number | null;
  fundingMode: string | null;
  manualSavedCents: bigint | null;
  monthlyCostCents: bigint | null;
  realReturnPct: number | null;
}): SerializedGoal {
  return {
    id: goal.id,
    type: goal.type,
    title: goal.title,
    status: goal.status,
    targetCents: goal.targetCents !== null ? goal.targetCents.toString() : null,
    deadlineIso: goal.deadline !== null ? goal.deadline.toISOString() : null,
    linkedDebtId: goal.linkedDebtId,
    linkedAssetId: goal.linkedAssetId,
    targetMonths: goal.targetMonths,
    fundingMode: goal.fundingMode,
    manualSavedCents:
      goal.manualSavedCents !== null ? goal.manualSavedCents.toString() : null,
    monthlyCostCents:
      goal.monthlyCostCents !== null ? goal.monthlyCostCents.toString() : null,
    realReturnPct: goal.realReturnPct,
  };
}

function serializeProgress(progress: {
  currentCents: bigint;
  targetCents: bigint;
  pct: number;
  reached: boolean;
  etaMonths: number | null;
  needsAttention: boolean;
}): SerializedGoalProgress {
  return {
    currentCents: progress.currentCents.toString(),
    targetCents: progress.targetCents.toString(),
    pct: progress.pct,
    reached: progress.reached,
    etaMonths: progress.etaMonths,
    needsAttention: progress.needsAttention,
  };
}

function buildDeps() {
  return {
    goals: new DrizzleGoalRepository(),
    assets: new DrizzleAssetRepository(),
    allocations: new DrizzleAssetDebtAllocationRepository(),
    debts: new DrizzleDebtRepository(),
    incomes: new DrizzleIncomeRepository(),
    clock: new SystemClock(),
  };
}

export async function fetchGoalsWithProgress(): Promise<
  SerializedGoalWithProgress[]
> {
  const user = await getCurrentUser();
  if (!user) return [];

  const deps = buildDeps();
  const list = await listGoalsWithProgress(deps, {
    userId: user.id,
    isPro: user.isPro,
  });

  return list.map(({ goal, progress, etaLocked }) => ({
    goal: serializeGoal(goal),
    progress: serializeProgress(progress),
    etaLocked,
  }));
}

export async function fetchGoalsLinkedToDebt(
  debtId: string,
): Promise<SerializedGoalWithProgress[]> {
  return filterByLinkedDebt(await fetchGoalsWithProgress(), debtId);
}

export async function fetchGoalsLinkedToAsset(
  assetId: string,
): Promise<SerializedGoalWithProgress[]> {
  return filterByLinkedAsset(await fetchGoalsWithProgress(), assetId);
}

export async function fetchGoalDetail(
  goalId: string,
): Promise<SerializedGoalDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const deps = {
    ...buildDeps(),
    snapshots: new DrizzleGoalSnapshotRepository(),
  };

  const result = await getGoalDetail(deps, {
    userId: user.id,
    goalId,
    isPro: user.isPro,
  });

  if (!result) return null;

  const { goal, progress, etaLocked, snapshots } = result;

  return {
    goal: serializeGoal(goal),
    progress: serializeProgress(progress),
    etaLocked,
    snapshots: snapshots.map((s) => ({
      monthIso: s.month.toISOString(),
      currentCents: s.currentCents.toString(),
      targetCents: s.targetCents.toString(),
    })),
  };
}
