export interface UserAchievementEntity {
  userId: string;
  slug: string;
  unlockedAt: Date;
  payload: Record<string, unknown>;
}
