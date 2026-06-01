import type { SerializedGoalWithProgress } from "./goal-queries";

export function filterByLinkedDebt(
  goals: SerializedGoalWithProgress[],
  debtId: string,
): SerializedGoalWithProgress[] {
  return goals.filter((g) => g.goal.linkedDebtId === debtId);
}

export function filterByLinkedAsset(
  goals: SerializedGoalWithProgress[],
  assetId: string,
): SerializedGoalWithProgress[] {
  return goals.filter((g) => g.goal.linkedAssetId === assetId);
}
