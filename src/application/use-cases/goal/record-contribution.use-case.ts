import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalSnapshotRepositoryPort } from "@/domain/ports/repositories/goal-snapshot.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { GoalProgressService } from "@/domain/services/goal-progress.service";
import { Money } from "@/domain/value-objects/money.vo";

export interface RecordContributionDeps {
  goals: Pick<GoalRepositoryPort, "findById" | "update">;
  assets: Pick<AssetRepositoryPort, "findById" | "create" | "update">;
  contributions: Pick<GoalContributionRepositoryPort, "add">;
  snapshots: Pick<GoalSnapshotRepositoryPort, "upsert">;
  buildMacro: (userId: string) => Promise<GoalMacro>;
  clock: Clock;
  newId: () => string;
}

export type RecordContributionResult = { ok: true } | { ok: false; message: string };

function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function recordContribution(
  deps: RecordContributionDeps,
  input: { userId: string; profileId: string; goalId: string; amountCents: bigint },
): Promise<RecordContributionResult> {
  const { userId, profileId, goalId, amountCents } = input;

  if (amountCents <= 0n) {
    return { ok: false, message: "O valor a guardar deve ser maior que zero." };
  }

  const goal = await deps.goals.findById(goalId);
  if (!goal || goal.profileId !== profileId) {
    return { ok: false, message: "Meta não encontrada." };
  }

  const accepts =
    goal.type === "emergency_fund" || (goal.type === "savings" && goal.fundingMode === "manual");
  if (!accepts) {
    return {
      ok: false,
      message: "Só dá pra guardar dinheiro em metas de reserva ou de juntar (modo manual).",
    };
  }

  if (goal.type === "emergency_fund") {
    await applyToReserve(deps, goal, amountCents);
  } else {
    const current = goal.manualSavedCents ?? 0n;
    await deps.goals.update(goalId, { manualSavedCents: current + amountCents });
  }

  await deps.contributions.add({
    id: deps.newId(),
    goalId,
    userId,
    profileId: goal.profileId,
    amountCents,
    createdAt: deps.clock.now(),
  });

  await upsertCurrentMonthSnapshot(deps, goalId, userId);

  return { ok: true };
}

async function applyToReserve(
  deps: RecordContributionDeps,
  goal: GoalEntity,
  amountCents: bigint,
): Promise<void> {
  const linked = goal.linkedAssetId
    ? await deps.assets.findById(goal.linkedAssetId, goal.profileId)
    : null;

  if (linked && linked.category === "cash") {
    await deps.assets.update({
      ...linked,
      currentValue: linked.currentValue.add(
        Money.fromCents(amountCents, linked.currentValue.currency),
      ),
      updatedAt: deps.clock.now(),
    });
    return;
  }

  const now = deps.clock.now();
  const created: AssetEntity = {
    id: deps.newId(),
    userId: goal.userId,
    profileId: goal.profileId,
    category: "cash",
    label: "Reserva de emergência",
    currentValue: Money.fromCents(amountCents),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    monthlyCostEstimateCents: null,
    createdAt: now,
    updatedAt: now,
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };

  await deps.assets.create(created);
  await deps.goals.update(goal.id, { linkedAssetId: created.id });
}

async function upsertCurrentMonthSnapshot(
  deps: RecordContributionDeps,
  goalId: string,
  userId: string,
): Promise<void> {
  try {
    const goal = await deps.goals.findById(goalId);
    if (!goal) return;
    const macro = await deps.buildMacro(userId);
    const progress = GoalProgressService.compute(goal, macro);
    const now = deps.clock.now();
    await deps.snapshots.upsert({
      goalId,
      month: firstOfMonth(now),
      currentCents: progress.currentCents,
      targetCents: progress.targetCents,
      capturedAt: now,
    });
  } catch {
    // best-effort
  }
}
