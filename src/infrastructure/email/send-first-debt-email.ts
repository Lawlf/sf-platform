import { loadEnv } from "@/infrastructure/config/env";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import {
  FIRST_DEBT_SUBJECT,
  FirstDebtEmail,
} from "@/infrastructure/email/templates/first-debt.email";
import { EmailSendRepository } from "@/infrastructure/persistence/drizzle/repositories/email-send.repository";
import { NotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/notification-preferences.repository";
import { UserRepository } from "@/infrastructure/persistence/drizzle/repositories/user.repository";

export async function sendFirstDebtEmail(userId: string): Promise<void> {
  try {
    const user = await new UserRepository().findById(userId);
    if (!user || user.deactivatedAt) return;

    const prefs = await new NotificationPreferencesRepository().findForUser(userId);
    if (prefs && !prefs.emailEnabled) return;

    const appUrl = loadEnv().NEXT_PUBLIC_APP_URL;
    const html = await renderEmailToHtml(
      FirstDebtEmail({ appUrl, displayName: user.displayName }),
    );
    await new ResendEmailService().send({
      to: user.email,
      subject: FIRST_DEBT_SUBJECT,
      html,
      purpose: "transactional",
    });
    await new EmailSendRepository().recordSend({
      userId,
      kind: "first_debt",
      dedupeKey: "first_debt",
    });
  } catch (e) {
    console.error("[first-debt] email failed (non-blocking):", e);
  }
}
