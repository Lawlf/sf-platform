"use server";

import { revalidatePath } from "next/cache";

import { updateGoalCascadeConfig } from "@/application/use-cases/goal/update-goal-cascade-config.use-case";
import { setLiquidBucket } from "@/application/use-cases/planning/set-liquid-bucket.use-case";
import type { GoalCascadeMode } from "@/domain/entities/goal.entity";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleFinancialPlanningSettingsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-financial-planning-settings.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export interface PlanningActionResult {
  ok: boolean;
  message?: string;
}

export async function setLiquidBucketAction(
  assetId: string | null,
): Promise<PlanningActionResult> {
  const user = await requireUser();
  const result = await setLiquidBucket(
    {
      assets: new DrizzleAssetRepository(),
      settings: new DrizzleFinancialPlanningSettingsRepository(),
    },
    { userId: user.id, assetId },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}

export async function updateGoalCascadeConfigAction(
  goalId: string,
  config: { mode: GoalCascadeMode; order: number; parallelFraction: number },
): Promise<PlanningActionResult> {
  const user = await requireUser();
  const result = await updateGoalCascadeConfig(
    { goals: new DrizzleGoalRepository() },
    {
      userId: user.id,
      goalId,
      isPro: user.isPro,
      mode: config.mode,
      order: config.order,
      parallelFraction: config.parallelFraction,
    },
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}
