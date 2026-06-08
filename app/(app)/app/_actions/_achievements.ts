import "server-only";

import { after } from "next/server";

import { awardAchievement } from "@/application/use-cases/achievement/award-achievement.use-case";
import { sendPushToUser } from "@/application/use-cases/push/send-push-to-user.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { sendFirstDebtEmail } from "@/infrastructure/email/send-first-debt-email";
import { DrizzleNotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification-preferences.repository";
import { DrizzleNotificationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification.repository";
import { DrizzlePushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-push-subscription.repository";
import { DrizzleUserAchievementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-achievement.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { getWebPushService } from "@/infrastructure/push/web-push.service";

/**
 * Concede uma conquista de evento a partir de um server action. Idempotente
 * (chamar em todo sucesso, mesmo que a conquista já exista). Falha silenciosa:
 * nunca quebra o fluxo principal do action.
 */
export async function awardEventAchievement(
  userId: string,
  slug: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    const users = new DrizzleUserRepository();
    const result = await awardAchievement(
      {
        userAchievements: new DrizzleUserAchievementRepository(),
        notifications: new DrizzleNotificationRepository(),
        clock: new SystemClock(),
        isPro: async (id) => {
          const u = await users.findById(id);
          return Boolean(u?.isPro);
        },
        sendPush: async (input) => {
          const r = await sendPushToUser(
            {
              pushService: getWebPushService(),
              pushSubscriptions: new DrizzlePushSubscriptionRepository(),
              preferences: new DrizzleNotificationPreferencesRepository(),
            },
            input,
          );
          return { delivered: r.delivered };
        },
      },
      { userId, slug, ...(payload !== undefined ? { payload } : {}) },
    );
    if (result.awarded && slug === "primeiro-passo") {
      after(() => sendFirstDebtEmail(userId));
    }
  } catch (error) {
    console.error("[achievements.event] falhou silenciosamente", error);
  }
}
