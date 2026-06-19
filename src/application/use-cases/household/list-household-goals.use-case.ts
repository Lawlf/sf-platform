import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { err, ok, type Result } from "@/shared/errors/result";

const CONTRIBUTIONS_FETCH_LIMIT = 10_000;

export interface HouseholdGoalView {
  goal: GoalEntity;
  savedCents: bigint;
  targetCents: bigint | null;
  progressPct: number | null;
  etaMonths: number | null;
}

export interface ListHouseholdGoalsDeps {
  households: HouseholdRepositoryPort;
  goals: GoalRepositoryPort;
  contributions: Pick<GoalContributionRepositoryPort, "listForGoal">;
  now?: () => Date;
}

export interface ListHouseholdGoalsInput {
  householdId: string;
  userId: string;
}

export type ListHouseholdGoalsResult = Result<HouseholdGoalView[], Forbidden>;

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function computeEtaMonths(
  contributions: GoalContributionEntity[],
  savedCents: bigint,
  targetCents: bigint | null,
  now: Date,
): number | null {
  if (targetCents === null || targetCents <= 0n) return null;

  const remaining = targetCents - savedCents;
  if (remaining <= 0n) return 0;

  if (contributions.length === 0) return null;

  const totalCents = contributions.reduce((sum, c) => sum + c.amountCents, 0n);
  if (totalCents <= 0n) return null;

  const distinctMonths = new Set(contributions.map((c) => monthKey(c.createdAt)));
  const nowKey = monthKey(now);
  distinctMonths.add(nowKey);
  const monthCount = BigInt(distinctMonths.size);

  const monthlyRhythm = totalCents / monthCount;
  if (monthlyRhythm <= 0n) return null;

  return Number((remaining + monthlyRhythm - 1n) / monthlyRhythm);
}

export async function listHouseholdGoals(
  deps: ListHouseholdGoalsDeps,
  input: ListHouseholdGoalsInput,
): Promise<ListHouseholdGoalsResult> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não é membro deste lar."));
  }

  const goals = await deps.goals.listForHousehold(input.householdId);

  const now = deps.now?.() ?? new Date();

  const views: HouseholdGoalView[] = await Promise.all(
    goals.map(async (goal) => {
      const savedCents = goal.manualSavedCents ?? 0n;
      const targetCents = goal.targetCents ?? null;
      const progressPct =
        targetCents !== null && targetCents > 0n
          ? Number((savedCents * 10000n) / targetCents) / 100
          : null;

      const contributions = await deps.contributions.listForGoal(
        goal.id,
        CONTRIBUTIONS_FETCH_LIMIT,
      );
      const etaMonths = computeEtaMonths(contributions, savedCents, targetCents, now);

      return { goal, savedCents, targetCents, progressPct, etaMonths };
    }),
  );

  return ok(views);
}
