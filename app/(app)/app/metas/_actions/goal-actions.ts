"use server";

import { z } from "zod";

import { archiveGoal } from "@/application/use-cases/goal/archive-goal.use-case";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { createGoal, type CreateGoalInput } from "@/application/use-cases/goal/create-goal.use-case";
import { deleteGoal } from "@/application/use-cases/goal/delete-goal.use-case";
import { recordContribution } from "@/application/use-cases/goal/record-contribution.use-case";
import { updateGoal } from "@/application/use-cases/goal/update-goal.use-case";
import { GoalProgressService } from "@/domain/services/goal-progress.service";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { awardEventAchievement } from "../../_actions/_achievements";
import { purgeEntityBestEffort } from "../../_actions/_purge-entity";

const goalTypeSchema = z.enum([
  "debt_payoff",
  "emergency_fund",
  "savings",
  "financial_independence",
]);

const goalFieldsSchema = z.object({
  title: z.string(),
  targetCents: z.string().nullable().optional(),
  deadlineIso: z.string().nullable().optional(),
  linkedDebtId: z.string().nullable().optional(),
  linkedAssetId: z.string().nullable().optional(),
  targetMonths: z.number().nullable().optional(),
  fundingMode: z.enum(["linked", "manual"]).nullable().optional(),
  manualSavedCents: z.string().nullable().optional(),
  monthlyCostCents: z.string().nullable().optional(),
  realReturnPct: z.number().nullable().optional(),
});

const createGoalSchema = goalFieldsSchema.extend({ type: goalTypeSchema });

const updateGoalSchema = z.object({
  goalId: z.string(),
  patch: goalFieldsSchema.partial(),
});

const recordContributionSchema = z.object({
  goalId: z.string(),
  amountCents: z.string(),
});

export type CreateGoalActionInput = z.input<typeof createGoalSchema>;
export type UpdateGoalActionPatch = z.input<typeof updateGoalSchema>["patch"];

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

export const createGoalAction = action({
  schema: createGoalSchema,
  revalidates: ["goals"],
  handler: async (input, { userId }) => {
    const user = await requireUser();
    const result = await createGoal(
      { goals: repos.goals },
      { userId, isPro: user.isPro, input: toCreateInput(input) },
    );
    if (!result.ok) throw new ActionError(result.message);

    try {
      const now = new Date();
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const macro = await buildGoalMacro(
        {
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
          debts: repos.debts,
          incomes: repos.incomes,
          clock,
          rates: repos.exchangeRates,
          overrides: repos.userFxOverrides,
        },
        { userId },
      );
      const progress = GoalProgressService.compute(result.goal, macro);
      await repos.goalSnapshots.upsert({
        goalId: result.goal.id,
        month,
        currentCents: progress.currentCents,
        targetCents: progress.targetCents,
        capturedAt: now,
      });
    } catch {
      // Snapshot é melhor-esforço: falha não pode bloquear a criação da meta.
    }

    await awardEventAchievement(userId, "norte-definido");
    return { goalId: result.goal.id };
  },
});

export const updateGoalAction = action({
  schema: updateGoalSchema,
  revalidates: ["goals"],
  handler: async ({ goalId, patch }, { userId }) => {
    const result = await updateGoal(
      { goals: repos.goals },
      {
        userId,
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
    if (!result.ok) throw new ActionError(result.message);
  },
});

export const recordContributionAction = action({
  schema: recordContributionSchema,
  revalidates: ["goals", "home"],
  handler: async ({ goalId, amountCents }, { userId }) => {
    const result = await recordContribution(
      {
        goals: repos.goals,
        assets: repos.assets,
        contributions: repos.goalContributions,
        snapshots: repos.goalSnapshots,
        buildMacro: (macroUserId) =>
          buildGoalMacro(
            {
              assets: repos.assets,
              allocations: repos.assetDebtAllocations,
              debts: repos.debts,
              incomes: repos.incomes,
              clock,
              rates: repos.exchangeRates,
              overrides: repos.userFxOverrides,
            },
            { userId: macroUserId },
          ),
        clock,
        newId: () => crypto.randomUUID(),
      },
      { userId, goalId, amountCents: BigInt(amountCents) },
    );
    if (!result.ok) throw new ActionError(result.message);
  },
});

export const archiveGoalAction = action({
  schema: z.string(),
  revalidates: ["goals"],
  handler: async (goalId, { userId }) => {
    const result = await archiveGoal({ goals: repos.goals }, { userId, goalId });
    if (!result.ok) throw new ActionError(result.message);
  },
});

export const deleteGoalAction = action({
  schema: z.string(),
  revalidates: ["goals"],
  handler: async (goalId, { userId }) => {
    const result = await deleteGoal({ goals: repos.goals }, { userId, goalId });
    if (!result.ok) throw new ActionError(result.message);
    await purgeEntityBestEffort(userId, "goal", goalId);
  },
});
