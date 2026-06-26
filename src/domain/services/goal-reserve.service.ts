import type { GoalEntity } from "@/domain/entities/goal.entity";

import { GoalProgressService, type GoalMacro } from "./goal-progress.service";

function horizonMonths(goal: GoalEntity, now: Date): number | null {
  if (goal.deadline) {
    const months =
      (goal.deadline.getUTCFullYear() - now.getUTCFullYear()) * 12 +
      (goal.deadline.getUTCMonth() - now.getUTCMonth());
    return months > 0 ? months : 1;
  }
  if (goal.targetMonths && goal.targetMonths > 0) return goal.targetMonths;
  return null;
}

export function plannedGoalReserveCents(args: {
  goals: GoalEntity[];
  macro: GoalMacro;
  now: Date;
}): bigint {
  let total = 0n;
  for (const goal of args.goals) {
    if (goal.status !== "active") continue;
    if (goal.cascadeOrder === null) continue;
    if (goal.type === "debt_payoff") continue;

    const horizon = horizonMonths(goal, args.now);
    if (horizon === null) continue;

    const progress = GoalProgressService.compute(goal, args.macro);
    if (progress.reached) continue;

    const remaining = progress.targetCents - progress.currentCents;
    if (remaining <= 0n) continue;

    total += remaining / BigInt(horizon);
  }
  return total;
}
