"use server";

import { revalidatePath } from "next/cache";

import { recordContribution } from "@/application/use-cases/goal/record-contribution.use-case";
import { archiveGoal } from "@/application/use-cases/goal/archive-goal.use-case";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { createGoal, type CreateGoalInput } from "@/application/use-cases/goal/create-goal.use-case";
import { deleteGoal } from "@/application/use-cases/goal/delete-goal.use-case";
import { updateGoal } from "@/application/use-cases/goal/update-goal.use-case";
import type { GoalFundingMode, GoalType } from "@/domain/entities/goal.entity";
import { GoalProgressService } from "@/domain/services/goal-progress.service";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { DrizzleGoalSnapshotRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal-snapshot.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleGoalContributionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal-contribution.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleUserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-fx-override.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { awardEventAchievement } from "../../_actions/_achievements";
import { purgeEntityBestEffort } from "../../_actions/_purge-entity";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface CreateGoalActionResult extends ActionResult {
  goalId?: string;
}

/** All cent values come from the client as strings and are converted to bigint here. */
export interface CreateGoalActionInput {
  type: GoalType;
  title: string;
  targetCents?: string | null;
  deadlineIso?: string | null;
  linkedDebtId?: string | null;
  linkedAssetId?: string | null;
  targetMonths?: number | null;
  fundingMode?: GoalFundingMode | null;
  manualSavedCents?: string | null;
  monthlyCostCents?: string | null;
  realReturnPct?: number | null;
}

/** Patch type for updateGoalAction: cent fields as strings from the client. */
export interface UpdateGoalActionPatch {
  title?: string;
  targetCents?: string | null;
  deadlineIso?: string | null;
  linkedDebtId?: string | null;
  linkedAssetId?: string | null;
  targetMonths?: number | null;
  fundingMode?: GoalFundingMode | null;
  manualSavedCents?: string | null;
  monthlyCostCents?: string | null;
  realReturnPct?: number | null;
}

function parseCents(value: string | null | undefined): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  return BigInt(value);
}

function toCreateInput(raw: CreateGoalActionInput): CreateGoalInput {
  return {
    type: raw.type,
    title: raw.title,
    targetCents: parseCents(raw.targetCents),
    deadline: raw.deadlineIso ? new Date(raw.deadlineIso) : null,
    linkedDebtId: raw.linkedDebtId ?? null,
    linkedAssetId: raw.linkedAssetId ?? null,
    targetMonths: raw.targetMonths ?? null,
    fundingMode: raw.fundingMode ?? null,
    manualSavedCents: parseCents(raw.manualSavedCents),
    monthlyCostCents: parseCents(raw.monthlyCostCents),
    realReturnPct: raw.realReturnPct ?? null,
  };
}

export async function createGoalAction(
  input: CreateGoalActionInput,
): Promise<CreateGoalActionResult> {
  const user = await requireUser();
  const goals = new DrizzleGoalRepository();
  const result = await createGoal(
    { goals },
    { userId: user.id, isPro: user.isPro, input: toCreateInput(input) },
  );
  if (!result.ok) return { ok: false, message: result.message };

  // Best-effort: write a current-month snapshot so the progress curve
  // is not empty when the user opens the detail page for the first time.
  try {
    const now = new Date();
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const macro = await buildGoalMacro(
      {
        assets: new DrizzleAssetRepository(),
        allocations: new DrizzleAssetDebtAllocationRepository(),
        debts: new DrizzleDebtRepository(),
        incomes: new DrizzleIncomeRepository(),
        clock: new SystemClock(),
        rates: new DrizzleExchangeRateRepository(),
        overrides: new DrizzleUserFxOverrideRepository(),
      },
      { userId: user.id },
    );
    const progress = GoalProgressService.compute(result.goal, macro);
    const snapshotRepo = new DrizzleGoalSnapshotRepository();
    await snapshotRepo.upsert({
      goalId: result.goal.id,
      month,
      currentCents: progress.currentCents,
      targetCents: progress.targetCents,
      capturedAt: now,
    });
  } catch {
    // Snapshot failure must never block goal creation.
  }

  revalidatePath("/app/metas");
  await awardEventAchievement(user.id, "norte-definido");
  return { ok: true, goalId: result.goal.id };
}

export async function updateGoalAction(
  goalId: string,
  patch: UpdateGoalActionPatch,
): Promise<ActionResult> {
  const user = await requireUser();
  const goals = new DrizzleGoalRepository();
  const result = await updateGoal(
    { goals },
    {
      userId: user.id,
      goalId,
      patch: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.targetCents !== undefined && {
          targetCents: parseCents(patch.targetCents),
        }),
        ...(patch.deadlineIso !== undefined && {
          deadline: patch.deadlineIso ? new Date(patch.deadlineIso) : null,
        }),
        ...(patch.linkedDebtId !== undefined && {
          linkedDebtId: patch.linkedDebtId,
        }),
        ...(patch.linkedAssetId !== undefined && {
          linkedAssetId: patch.linkedAssetId,
        }),
        ...(patch.targetMonths !== undefined && {
          targetMonths: patch.targetMonths,
        }),
        ...(patch.fundingMode !== undefined && {
          fundingMode: patch.fundingMode,
        }),
        ...(patch.manualSavedCents !== undefined && {
          manualSavedCents: parseCents(patch.manualSavedCents),
        }),
        ...(patch.monthlyCostCents !== undefined && {
          monthlyCostCents: parseCents(patch.monthlyCostCents),
        }),
        ...(patch.realReturnPct !== undefined && {
          realReturnPct: patch.realReturnPct,
        }),
      },
    },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app/metas");
  return { ok: true };
}

export async function recordContributionAction(
  goalId: string,
  amountCents: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const result = await recordContribution(
    {
      goals: new DrizzleGoalRepository(),
      assets: new DrizzleAssetRepository(),
      contributions: new DrizzleGoalContributionRepository(),
      snapshots: new DrizzleGoalSnapshotRepository(),
      buildMacro: (userId) =>
        buildGoalMacro(
          {
            assets: new DrizzleAssetRepository(),
            allocations: new DrizzleAssetDebtAllocationRepository(),
            debts: new DrizzleDebtRepository(),
            incomes: new DrizzleIncomeRepository(),
            clock: new SystemClock(),
            rates: new DrizzleExchangeRateRepository(),
            overrides: new DrizzleUserFxOverrideRepository(),
          },
          { userId },
        ),
      clock: new SystemClock(),
      newId: () => crypto.randomUUID(),
    },
    { userId: user.id, goalId, amountCents: BigInt(amountCents) },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app/metas");
  revalidatePath("/app");
  return { ok: true };
}

export async function archiveGoalAction(goalId: string): Promise<ActionResult> {
  const user = await requireUser();
  const goals = new DrizzleGoalRepository();
  const result = await archiveGoal({ goals }, { userId: user.id, goalId });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app/metas");
  return { ok: true };
}

export async function deleteGoalAction(goalId: string): Promise<ActionResult> {
  const user = await requireUser();
  const goals = new DrizzleGoalRepository();
  const result = await deleteGoal({ goals }, { userId: user.id, goalId });
  if (!result.ok) return { ok: false, message: result.message };
  await purgeEntityBestEffort(user.id, "goal", goalId);
  revalidatePath("/app/metas");
  return { ok: true };
}
