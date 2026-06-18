export interface GoalContributionEntity {
  id: string;
  goalId: string;
  userId: string;
  profileId: string;
  amountCents: bigint;
  createdAt: Date;
}
