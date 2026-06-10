"use server";

import { z } from "zod";

import { sendPushToUser } from "@/application/use-cases/push/send-push-to-user.use-case";
import { Forbidden } from "@/domain/errors/auth-errors";
import { repos } from "@/infrastructure/container";
import { getWebPushService } from "@/infrastructure/push/web-push.service";
import { action } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export const sendTestPushAction = action({
  schema: z.void(),
  handler: async (_input, { userId }) => {
    const user = await requireUser();
    if (!user.isPro) {
      throw new Forbidden("Notificações push são exclusivas do plano Pro.");
    }
    const result = await sendPushToUser(
      {
        pushService: getWebPushService(),
        pushSubscriptions: repos.pushSubscriptions,
        preferences: repos.notificationPreferences,
      },
      {
        userId,
        kind: "test",
        payload: {
          title: "Teste do Sabor Financeiro",
          body: "Push funcionando. Você vai receber assim os avisos reais.",
          url: "/app/perfil/notificacoes",
          tag: "test-push",
        },
      },
    );
    return { delivered: result.delivered, skipped: result.skipped };
  },
});
