import type { UserAchievementEntity } from "@/domain/entities/user-achievement.entity";

export interface UserAchievementRepositoryPort {
  unlock(
    userId: string,
    slug: string,
    unlockedAt: Date,
    payload?: Record<string, unknown>,
  ): Promise<boolean>;
  listForUser(userId: string): Promise<UserAchievementEntity[]>;
  hasUnlocked(userId: string, slug: string): Promise<boolean>;
}
