export type GoalType =
  | "debt_payoff"
  | "emergency_fund"
  | "savings"
  | "financial_independence";

export type GoalStatus = "active" | "reached" | "archived";
export type GoalFundingMode = "linked" | "manual";
export type GoalCascadeMode = "queue" | "parallel";

export interface GoalEntity {
  id: string;
  userId: string;
  profileId: string;
  type: GoalType;
  title: string;
  status: GoalStatus;
  targetCents: bigint | null;
  deadline: Date | null;
  linkedDebtId: string | null;
  linkedAssetId: string | null;
  targetMonths: number | null;
  fundingMode: GoalFundingMode | null;
  manualSavedCents: bigint | null;
  monthlyCostCents: bigint | null;
  realReturnPct: number | null;
  cascadeOrder: number | null;
  cascadeMode: GoalCascadeMode | null;
  cascadeParallelPct: number | null;
  createdAt: Date;
  updatedAt: Date;
}
