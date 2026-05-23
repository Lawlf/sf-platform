"use server";

import { sendPushToUser } from "@/application/use-cases/push/send-push-to-user.use-case";
import { DrizzleNotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification-preferences.repository";
import { DrizzlePushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-push-subscription.repository";
import { getWebPushService } from "@/infrastructure/push/web-push.service";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export async function sendTestPushAction(): Promise<
  { ok: true; delivered: number; skipped: boolean } | { ok: false; message: string }
> {
  const user = await requireUser();
  if (!user.isPro) {
    return { ok: false, message: "Notificações push são exclusivas do plano Pro." };
  }
  const result = await sendPushToUser(
    {
      pushService: getWebPushService(),
      pushSubscriptions: new DrizzlePushSubscriptionRepository(),
      preferences: new DrizzleNotificationPreferencesRepository(),
    },
    {
      userId: user.id,
      kind: "test",
      payload: {
        title: "Teste do Sabor Financeiro",
        body: "Push funcionando. Você vai receber assim os avisos reais.",
        url: "/app/perfil/notificacoes",
        tag: "test-push",
      },
    },
  );
  return { ok: true, delivered: result.delivered, skipped: result.skipped };
}
