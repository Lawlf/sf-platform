import { getAchievement } from "@/domain/achievements/achievement.catalog";
import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import type { UserAchievementRepositoryPort } from "@/domain/ports/repositories/user-achievement.repository";

export interface AwardAchievementDeps {
  userAchievements: UserAchievementRepositoryPort;
  notifications: NotificationRepositoryPort;
  clock: Clock;
  isPro: (userId: string) => Promise<boolean>;
  sendPush: (input: {
    userId: string;
    kind: "monthlySummaryEnabled";
    payload: { title: string; body: string; url: string; tag: string };
  }) => Promise<{ delivered: number }>;
}

export interface AwardAchievementInput {
  userId: string;
  slug: string;
  payload?: Record<string, unknown>;
}

export interface AwardAchievementResult {
  awarded: boolean;
}

export async function awardAchievement(
  deps: AwardAchievementDeps,
  input: AwardAchievementInput,
): Promise<AwardAchievementResult> {
  const def = getAchievement(input.slug);
  if (!def) return { awarded: false };

  const now = deps.clock.now();
  const isNew = await deps.userAchievements.unlock(
    input.userId,
    input.slug,
    now,
    input.payload ?? {},
  );
  if (!isNew) return { awarded: false };

  const notification: NotificationEntity = {
    id: crypto.randomUUID(),
    userId: input.userId,
    kind: "achievement_unlocked",
    monthIso: null,
    triggeredAt: now,
    payload: {
      eyebrow: "Conquista desbloqueada",
      line: def.title,
      iconName: def.iconName,
      slug: def.slug,
      description: def.description,
      url: "/app/conquistas",
      cta: "Ver conquistas",
    },
    dismissedAt: null,
    readAt: null,
    createdAt: now,
  };

  try {
    await deps.notifications.create(notification);
  } catch (error) {
    console.error("[achievements.award] falha ao criar notificação", error);
  }

  try {
    if (await deps.isPro(input.userId)) {
      await deps.sendPush({
        userId: input.userId,
        kind: "monthlySummaryEnabled",
        payload: {
          title: "Conquista desbloqueada",
          body: def.title,
          url: "/app/perfil",
          tag: `achievement-${def.slug}`,
        },
      });
    }
  } catch (error) {
    console.error("[achievements.award] falha ao enviar push", error);
  }

  return { awarded: true };
}
