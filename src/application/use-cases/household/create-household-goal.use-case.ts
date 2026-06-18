import type { GoalEntity } from "@/domain/entities/goal.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CreateHouseholdGoalDeps {
  households: HouseholdRepositoryPort;
  goals: GoalRepositoryPort;
  clock: Clock;
  newId: () => string;
}

export interface CreateHouseholdGoalInput {
  householdId: string;
  userId: string;
  profileId: string;
  label: string;
  targetCents: bigint;
}

export type CreateHouseholdGoalResult = Result<GoalEntity, Forbidden>;

export async function createHouseholdGoal(
  deps: CreateHouseholdGoalDeps,
  input: CreateHouseholdGoalInput,
): Promise<CreateHouseholdGoalResult> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não é membro deste lar."));
  }

  const goal = await deps.goals.create({
    id: deps.newId(),
    userId: input.userId,
    profileId: input.profileId,
    householdId: input.householdId,
    type: "savings",
    title: input.label,
    status: "active",
    fundingMode: "manual",
    manualSavedCents: 0n,
    targetCents: input.targetCents,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: null,
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: null,
    cascadeMode: null,
    cascadeParallelPct: null,
  });

  return ok(goal);
}
