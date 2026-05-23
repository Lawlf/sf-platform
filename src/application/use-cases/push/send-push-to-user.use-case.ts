import type { NotificationKindKey } from "@/domain/entities/notification-preferences.entity";
import type { NotificationPreferencesRepository } from "@/domain/ports/repositories/notification-preferences.repository";
import type { PushSubscriptionRepository } from "@/domain/ports/repositories/push-subscription.repository";
import type { PushPayload, PushService } from "@/domain/ports/services/push.service";


export interface SendPushToUserDeps {
  pushService: PushService;
  pushSubscriptions: PushSubscriptionRepository;
  preferences: NotificationPreferencesRepository;
}

export interface SendPushToUserInput {
  userId: string;
  kind: NotificationKindKey | "test";
  payload: PushPayload;
}

export interface SendPushToUserResult {
  attempted: number;
  delivered: number;
  removed: number;
  skipped: boolean;
}

/**
 * Envia push pra todos os devices ativos do user.
 * Checa preferences: respeita master switch (pushEnabled) + flag por tipo.
 * Remove subscriptions expiradas (410/404).
 * "test" sempre tenta enviar (ignora flag por tipo, mas respeita master).
 */
export async function sendPushToUser(
  deps: SendPushToUserDeps,
  input: SendPushToUserInput,
): Promise<SendPushToUserResult> {
  const prefs = await deps.preferences.findForUser(input.userId);
  if (prefs && !prefs.pushEnabled) {
    return { attempted: 0, delivered: 0, removed: 0, skipped: true };
  }
  if (prefs && input.kind !== "test" && !prefs[input.kind]) {
    return { attempted: 0, delivered: 0, removed: 0, skipped: true };
  }

  const subs = await deps.pushSubscriptions.listForUser(input.userId);
  if (subs.length === 0) {
    return { attempted: 0, delivered: 0, removed: 0, skipped: false };
  }

  let delivered = 0;
  let removed = 0;
  for (const sub of subs) {
    const result = await deps.pushService.send(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      input.payload,
    );
    if (result.status === "ok") {
      delivered++;
    } else if (result.status === "gone") {
      await deps.pushSubscriptions.deleteByEndpoint(sub.endpoint);
      removed++;
    }
  }
  return { attempted: subs.length, delivered, removed, skipped: false };
}
