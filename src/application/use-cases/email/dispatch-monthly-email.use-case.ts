import type { Clock } from "@/domain/ports/clock.port";
import type { EmailSendRepositoryPort } from "@/domain/ports/repositories/email-send.repository";
import type { NotificationPreferencesRepositoryPort } from "@/domain/ports/repositories/notification-preferences.repository";
import type { UserActivityRepositoryPort } from "@/domain/ports/repositories/user-activity.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import {
  monthlyNudgeSubject,
  MonthlyNudgeEmail,
} from "@/infrastructure/email/templates/monthly-nudge.email";
import { buildUnsubscribeHeaders, buildUnsubscribeUrl } from "@/infrastructure/email/unsubscribe-token";

const DAY_MS = 24 * 60 * 60 * 1000;
const SUPPRESS_WINDOW_DAYS = 5;
const ACTIVE_WINDOW_DAYS = 45;

export interface DispatchMonthlyEmailDeps {
  userActivity: UserActivityRepositoryPort;
  preferences: NotificationPreferencesRepositoryPort;
  emailSends: EmailSendRepositoryPort;
  email: EmailService;
  clock: Clock;
  appUrl: string;
  /** Teto de envios neste lote (reserva cota pra auth/transacional). */
  maxSends?: number;
}

export interface DispatchMonthlyEmailResult {
  sent: number;
}

export async function dispatchMonthlyEmail(
  deps: DispatchMonthlyEmailDeps,
): Promise<DispatchMonthlyEmailResult> {
  const now = deps.clock.now();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long" });
  const subject = monthlyNudgeSubject(monthLabel);
  const period = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
  const suppressBefore = new Date(now.getTime() - SUPPRESS_WINDOW_DAYS * DAY_MS);
  const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);

  const users = await deps.userActivity.findActiveSince(activeSince);
  let sent = 0;

  for (const user of users) {
    if (deps.maxSends != null && sent >= deps.maxSends) break;
    try {
      const prefs = await deps.preferences.findForUser(user.id);
      if (prefs && (!prefs.emailEnabled || !prefs.monthlySummaryEnabled)) continue;

      if (await deps.emailSends.hasSentSince(user.id, suppressBefore)) continue;

      const { recorded } = await deps.emailSends.recordSend({
        userId: user.id,
        kind: "monthly",
        dedupeKey: `monthly:${period}`,
      });
      if (!recorded) continue;

      const unsubscribeUrl = buildUnsubscribeUrl(deps.appUrl, user.id, "monthly");
      const html = await renderEmailToHtml(
        MonthlyNudgeEmail({
          appUrl: deps.appUrl,
          displayName: user.displayName,
          monthLabel,
          unsubscribeUrl,
        }),
      );
      await deps.email.send({
        to: user.email,
        subject,
        html,
        purpose: "transactional",
        headers: buildUnsubscribeHeaders(deps.appUrl, user.id, "monthly"),
      });
      sent += 1;
    } catch (e) {
      console.error("[monthly-email] failed for user (non-blocking):", user.id, e);
    }
  }

  return { sent };
}
