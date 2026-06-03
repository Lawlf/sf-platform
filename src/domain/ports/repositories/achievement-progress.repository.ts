export interface AchievementProgressState {
  qualifiedMonths: number;
  lastQualifiedMonth: string | null;
}

export interface AchievementProgressRepository {
  get(userId: string, slug: string): Promise<AchievementProgressState | null>;
  set(
    userId: string,
    slug: string,
    state: AchievementProgressState,
    updatedAt: Date,
  ): Promise<void>;
}
