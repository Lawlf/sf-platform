import { Forbidden } from "@/domain/errors/auth-errors";
import { InvalidMoneyAmountError } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export class HouseholdGoalNotFound extends DomainError {
  readonly code = "HOUSEHOLD_GOAL_NOT_FOUND" as const;
}

export interface ContributeHouseholdGoalDeps {
  households: HouseholdRepositoryPort;
  goals: GoalRepositoryPort;
  contributions: GoalContributionRepositoryPort;
  clock: Clock;
  newId: () => string;
}

export interface ContributeHouseholdGoalInput {
  householdId: string;
  userId: string;
  profileId: string;
  goalId: string;
  amountCents: bigint;
}

export type ContributeHouseholdGoalResult = Result<
  void,
  Forbidden | InvalidMoneyAmountError | HouseholdGoalNotFound
>;

export async function contributeHouseholdGoal(
  deps: ContributeHouseholdGoalDeps,
  input: ContributeHouseholdGoalInput,
): Promise<ContributeHouseholdGoalResult> {
  if (input.amountCents <= 0n) {
    return err(new InvalidMoneyAmountError("O valor do aporte deve ser maior que zero."));
  }

  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não é membro deste lar."));
  }

  const goal = await deps.goals.findByIdInHousehold(input.goalId, input.householdId);
  if (!goal) {
    return err(new HouseholdGoalNotFound("Meta não encontrada."));
  }

  const currentSaved = goal.manualSavedCents ?? 0n;
  await deps.goals.update(input.goalId, {
    manualSavedCents: currentSaved + input.amountCents,
  });

  const now = deps.clock.now();
  await deps.contributions.add({
    id: deps.newId(),
    goalId: input.goalId,
    userId: input.userId,
    profileId: input.profileId,
    amountCents: input.amountCents,
    createdAt: now,
  });

  return ok(undefined);
}
