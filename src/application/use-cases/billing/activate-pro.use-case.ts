import type { Clock } from "@/domain/ports/clock.port";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import {
  PRO_WELCOME_SUBJECT,
  ProWelcomeEmail,
} from "@/infrastructure/email/templates/pro-welcome.email";

export interface ActivateProDeps {
  users: UserRepository;
  email: EmailService;
  clock: Clock;
  appUrl: string;
}

export async function activatePro(deps: ActivateProDeps, userId: string): Promise<void> {
  const user = await deps.users.findById(userId);
  if (!user) return;
  const wasFreeBefore = !user.isPro || user.plan !== "pro";
  if (wasFreeBefore) {
    const updated = { ...user, isPro: true, plan: "pro" as const, updatedAt: deps.clock.now() };
    await deps.users.update(updated);
    // Deactivated accounts must not receive any e-mail (LGPD: account hidden,
    // data retained but no outreach). Keep the billing flag consistent, skip
    // the welcome message.
    if (user.deactivatedAt) return;
    try {
      const html = await renderEmailToHtml(
        ProWelcomeEmail({ appUrl: deps.appUrl, displayName: user.displayName }),
      );
      await deps.email.send({
        to: user.email,
        subject: PRO_WELCOME_SUBJECT,
        html,
        purpose: "transactional",
      });
    } catch (e) {
      console.error("[activate-pro] welcome email failed (non-blocking):", e);
    }
  }
}
