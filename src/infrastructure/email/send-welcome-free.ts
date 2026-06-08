import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import {
  WELCOME_FREE_SUBJECT,
  WelcomeFreeEmail,
} from "@/infrastructure/email/templates/welcome-free.email";
import { DrizzleEmailSendRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-email-send.repository";

export async function sendWelcomeFreeEmail(params: {
  userId: string;
  to: string;
  displayName: string | null;
  appUrl: string;
}): Promise<void> {
  try {
    const html = await renderEmailToHtml(
      WelcomeFreeEmail({ appUrl: params.appUrl, displayName: params.displayName }),
    );
    await new ResendEmailService().send({
      to: params.to,
      subject: WELCOME_FREE_SUBJECT,
      html,
      purpose: "transactional",
    });
    await new DrizzleEmailSendRepository().recordSend({
      userId: params.userId,
      kind: "welcome_free",
      dedupeKey: "welcome_free",
    });
  } catch (e) {
    console.error("[welcome-free] email failed (non-blocking):", e);
  }
}
