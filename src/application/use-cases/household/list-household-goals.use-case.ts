import type { GoalEntity } from "@/domain/entities/goal.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface HouseholdGoalView {
  goal: GoalEntity;
  savedCents: bigint;
  targetCents: bigint | null;
  progressPct: number | null;
}

export interface ListHouseholdGoalsDeps {
  households: HouseholdRepositoryPort;
  goals: GoalRepositoryPort;
  contributions: Pick<GoalContributionRepositoryPort, "listForGoal">;
}

export interface ListHouseholdGoalsInput {
  householdId: string;
  userId: string;
}

export type ListHouseholdGoalsResult = Result<HouseholdGoalView[], Forbidden>;

export async function listHouseholdGoals(
  deps: ListHouseholdGoalsDeps,
  input: ListHouseholdGoalsInput,
): Promise<ListHouseholdGoalsResult> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não é membro deste lar."));
  }

  const goals = await deps.goals.listForHousehold(input.householdId);

  const views: HouseholdGoalView[] = goals.map((goal) => {
    const savedCents = goal.manualSavedCents ?? 0n;
    const targetCents = goal.targetCents ?? null;
    const progressPct =
      targetCents !== null && targetCents > 0n
        ? Number((savedCents * 10000n) / targetCents) / 100
        : null;
    return { goal, savedCents, targetCents, progressPct };
  });

  return ok(views);
}
