export interface GoalContributionEntity {
  id: string;
  goalId: string;
  userId: string;
  amountCents: bigint;
  createdAt: Date;
}
