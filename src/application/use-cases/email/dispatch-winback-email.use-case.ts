import type { Clock } from "@/domain/ports/clock.port";
import type { EmailSendRepository } from "@/domain/ports/repositories/email-send.repository";
import type { NotificationPreferencesRepository } from "@/domain/ports/repositories/notification-preferences.repository";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import { WINBACK_SUBJECT, WinbackEmail } from "@/infrastructure/email/templates/winback.email";
import { buildUnsubscribeHeaders, buildUnsubscribeUrl } from "@/infrastructure/email/unsubscribe-token";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;

export interface DispatchWinbackEmailDeps {
  subscriptions: SubscriptionRepository;
  users: UserRepository;
  preferences: NotificationPreferencesRepository;
  emailSends: EmailSendRepository;
  email: EmailService;
  clock: Clock;
  appUrl: string;
}

export interface DispatchWinbackEmailResult {
  sent: number;
}

export async function dispatchWinbackEmail(
  deps: DispatchWinbackEmailDeps,
): Promise<DispatchWinbackEmailResult> {
  const now = deps.clock.now().getTime();
  const start = new Date(now - (WINDOW_DAYS + 1) * DAY_MS);
  const end = new Date(now - WINDOW_DAYS * DAY_MS);

  const ended = await deps.subscriptions.findEndedBetween(start, end);
  const seen = new Set<string>();
  let sent = 0;

  for (const sub of ended) {
    if (seen.has(sub.userId)) continue;
    seen.add(sub.userId);

    try {
      const user = await deps.users.findById(sub.userId);
      if (!user || user.deactivatedAt) continue;
      if (user.isPro || user.plan === "pro") continue;

      const prefs = await deps.preferences.findForUser(user.id);
      if (prefs && (!prefs.emailEnabled || !prefs.promotionsEnabled)) continue;

      const { recorded } = await deps.emailSends.recordSend({
        userId: user.id,
        kind: "winback",
        dedupeKey: `winback:${sub.id}`,
      });
      if (!recorded) continue;

      const unsubscribeUrl = buildUnsubscribeUrl(deps.appUrl, user.id, "promotions");
      const html = await renderEmailToHtml(
        WinbackEmail({ appUrl: deps.appUrl, displayName: user.displayName, unsubscribeUrl }),
      );
      await deps.email.send({
        to: user.email,
        subject: WINBACK_SUBJECT,
        html,
        purpose: "transactional",
        headers: buildUnsubscribeHeaders(deps.appUrl, user.id, "promotions"),
      });
      sent += 1;
    } catch (e) {
      console.error("[winback-email] failed for user (non-blocking):", sub.userId, e);
    }
  }

  return { sent };
}
