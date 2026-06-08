import type { Clock } from "@/domain/ports/clock.port";
import type { EmailSendRepository } from "@/domain/ports/repositories/email-send.repository";
import type { NotificationPreferencesRepository } from "@/domain/ports/repositories/notification-preferences.repository";
import type { UserActivityRepository } from "@/domain/ports/repositories/user-activity.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import { INACTIVITY_SUBJECT, InactivityEmail } from "@/infrastructure/email/templates/inactivity.email";
import { buildUnsubscribeHeaders, buildUnsubscribeUrl } from "@/infrastructure/email/unsubscribe-token";

const DAY_MS = 24 * 60 * 60 * 1000;
const LAPSE_DAYS = 45;

export interface DispatchInactivityEmailDeps {
  userActivity: UserActivityRepository;
  preferences: NotificationPreferencesRepository;
  emailSends: EmailSendRepository;
  email: EmailService;
  clock: Clock;
  appUrl: string;
}

export interface DispatchInactivityEmailResult {
  sent: number;
}

export async function dispatchInactivityEmail(
  deps: DispatchInactivityEmailDeps,
): Promise<DispatchInactivityEmailResult> {
  const now = deps.clock.now();
  const start = new Date(now.getTime() - (LAPSE_DAYS + 1) * DAY_MS);
  const end = new Date(now.getTime() - LAPSE_DAYS * DAY_MS);
  const dayKey = now.toISOString().slice(0, 10);

  const users = await deps.userActivity.findLapsed(start, end);
  let sent = 0;

  for (const user of users) {
    try {
      const prefs = await deps.preferences.findForUser(user.id);
      if (prefs && !prefs.emailEnabled) continue;

      const { recorded } = await deps.emailSends.recordSend({
        userId: user.id,
        kind: "inactivity",
        dedupeKey: `inactivity:${dayKey}`,
      });
      if (!recorded) continue;

      const unsubscribeUrl = buildUnsubscribeUrl(deps.appUrl, user.id, "all");
      const html = await renderEmailToHtml(
        InactivityEmail({ appUrl: deps.appUrl, displayName: user.displayName, unsubscribeUrl }),
      );
      await deps.email.send({
        to: user.email,
        subject: INACTIVITY_SUBJECT,
        html,
        purpose: "transactional",
        headers: buildUnsubscribeHeaders(deps.appUrl, user.id, "all"),
      });
      sent += 1;
    } catch (e) {
      console.error("[inactivity-email] failed for user (non-blocking):", user.id, e);
    }
  }

  return { sent };
}
