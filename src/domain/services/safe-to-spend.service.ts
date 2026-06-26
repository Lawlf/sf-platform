import { WEEKS_PER_MONTH } from "./monthly-frequency";

export type ConservativeLevel = "cautious" | "normal" | "optimistic";

export const CONSERVATIVE_PCT: Record<ConservativeLevel, bigint> = {
  cautious: 70n,
  normal: 85n,
  optimistic: 100n,
};

export const DEFAULT_CONSERVATIVE_LEVEL: ConservativeLevel = "normal";

export interface SafeToSpendIncome {
  monthlyCents: bigint;
  isEstimated: boolean;
}

export interface SafeToSpendInput {
  incomes: SafeToSpendIncome[];
  monthlyCommitmentsCents: bigint;
  goalRequiredMonthlyCents: bigint;
  level: ConservativeLevel;
}

export type SafeToSpendState = "ok" | "tight-by-goal" | "underwater";

export interface SafeToSpend {
  conservativeIncomeCents: bigint;
  poolCents: bigint;
  perWeekCents: bigint;
  poolWithoutGoalCents: bigint;
  perWeekWithoutGoalCents: bigint;
  shortfallCents: bigint;
  state: SafeToSpendState;
}

function perWeek(poolCents: bigint): bigint {
  if (poolCents <= 0n) return 0n;
  return BigInt(Math.round(Number(poolCents) / WEEKS_PER_MONTH));
}

export function computeSafeToSpend(input: SafeToSpendInput): SafeToSpend {
  const pct = CONSERVATIVE_PCT[input.level];
  const conservativeIncomeCents = input.incomes.reduce((sum, i) => {
    const adjusted = i.isEstimated ? (i.monthlyCents * pct) / 100n : i.monthlyCents;
    return sum + adjusted;
  }, 0n);

  const poolWithoutGoalCents = conservativeIncomeCents - input.monthlyCommitmentsCents;
  const poolCents = poolWithoutGoalCents - input.goalRequiredMonthlyCents;

  let state: SafeToSpendState;
  if (poolCents > 0n) state = "ok";
  else if (poolWithoutGoalCents > 0n) state = "tight-by-goal";
  else state = "underwater";

  return {
    conservativeIncomeCents,
    poolCents,
    perWeekCents: perWeek(poolCents),
    poolWithoutGoalCents,
    perWeekWithoutGoalCents: perWeek(poolWithoutGoalCents),
    shortfallCents: poolCents < 0n ? -poolCents : 0n,
    state,
  };
}

export function goalRequiredMonthlyCents(
  goal: { targetCents: bigint | null; manualSavedCents: bigint | null; deadline: Date | null },
  now: Date,
): bigint {
  if (goal.targetCents === null || goal.deadline === null) return 0n;
  const remaining = goal.targetCents - (goal.manualSavedCents ?? 0n);
  if (remaining <= 0n) return 0n;
  const raw =
    (goal.deadline.getUTCFullYear() - now.getUTCFullYear()) * 12 +
    (goal.deadline.getUTCMonth() - now.getUTCMonth());
  if (raw < 0) return 0n;
  const months = Math.max(1, raw);
  return remaining / BigInt(months);
}
