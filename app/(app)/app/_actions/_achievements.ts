import "server-only";

import { after } from "next/server";

import { awardAchievement } from "@/application/use-cases/achievement/award-achievement.use-case";
import { sendPushToUser } from "@/application/use-cases/push/send-push-to-user.use-case";
import { clock, repos } from "@/infrastructure/container";
import { sendFirstDebtEmail } from "@/infrastructure/email/send-first-debt-email";
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
    const users = repos.users;
    const result = await awardAchievement(
      {
        userAchievements: repos.userAchievements,
        notifications: repos.notifications,
        clock,
        isPro: async (id) => {
          const u = await users.findById(id);
          return Boolean(u?.isPro);
        },
        sendPush: async (input) => {
          const r = await sendPushToUser(
            {
              pushService: getWebPushService(),
              pushSubscriptions: repos.pushSubscriptions,
              preferences: repos.notificationPreferences,
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
