import type { Clock } from "@/domain/ports/clock.port";
import type { EmailSendRepository } from "@/domain/ports/repositories/email-send.repository";
import type { NotificationPreferencesRepository } from "@/domain/ports/repositories/notification-preferences.repository";
import type { UserActivityRepository } from "@/domain/ports/repositories/user-activity.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import { UPSELL_PRO_SUBJECT, UpsellProEmail } from "@/infrastructure/email/templates/upsell-pro.email";
import { buildUnsubscribeHeaders, buildUnsubscribeUrl } from "@/infrastructure/email/unsubscribe-token";

const DAY_MS = 24 * 60 * 60 * 1000;
const ENGAGED_DAYS = 30;
const MIN_ACCOUNT_AGE_DAYS = 14;

export interface DispatchUpsellEmailDeps {
  userActivity: UserActivityRepository;
  preferences: NotificationPreferencesRepository;
  emailSends: EmailSendRepository;
  email: EmailService;
  clock: Clock;
  appUrl: string;
}

export interface DispatchUpsellEmailResult {
  sent: number;
}

export async function dispatchUpsellEmail(
  deps: DispatchUpsellEmailDeps,
): Promise<DispatchUpsellEmailResult> {
  const now = deps.clock.now();
  const activeSince = new Date(now.getTime() - ENGAGED_DAYS * DAY_MS);
  const createdBefore = new Date(now.getTime() - MIN_ACCOUNT_AGE_DAYS * DAY_MS);

  const users = await deps.userActivity.findEngagedFreeUsers({ activeSince, createdBefore });
  let sent = 0;

  for (const user of users) {
    try {
      const prefs = await deps.preferences.findForUser(user.id);
      if (prefs && (!prefs.emailEnabled || !prefs.promotionsEnabled)) continue;

      const { recorded } = await deps.emailSends.recordSend({
        userId: user.id,
        kind: "upsell",
        dedupeKey: "upsell",
      });
      if (!recorded) continue;

      const unsubscribeUrl = buildUnsubscribeUrl(deps.appUrl, user.id, "promotions");
      const html = await renderEmailToHtml(
        UpsellProEmail({ appUrl: deps.appUrl, displayName: user.displayName, unsubscribeUrl }),
      );
      await deps.email.send({
        to: user.email,
        subject: UPSELL_PRO_SUBJECT,
        html,
        purpose: "transactional",
        headers: buildUnsubscribeHeaders(deps.appUrl, user.id, "promotions"),
      });
      sent += 1;
    } catch (e) {
      console.error("[upsell-email] failed for user (non-blocking):", user.id, e);
    }
  }

  return { sent };
}
