import { isSubscriptionActive } from "@/domain/entities/subscription.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import {
  SUBSCRIPTION_ENDED_SUBJECT,
  SubscriptionEndedEmail,
} from "@/infrastructure/email/templates/subscription-ended.email";

export interface DowngradeToFreeDeps {
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  email: EmailService;
  clock: Clock;
  appUrl: string;
}

export async function downgradeToFree(deps: DowngradeToFreeDeps, userId: string): Promise<void> {
  const otherActive = await deps.subscriptions.findActiveByUserId(userId);
  if (otherActive && isSubscriptionActive(otherActive, deps.clock.now())) return;

  const user = await deps.users.findById(userId);
  if (!user) return;
  if (user.isPro || user.plan === "pro") {
    const updated = { ...user, isPro: false, plan: "free" as const, updatedAt: deps.clock.now() };
    await deps.users.update(updated);
  }
  try {
    const html = await renderEmailToHtml(
      SubscriptionEndedEmail({ appUrl: deps.appUrl, displayName: user.displayName }),
    );
    await deps.email.send({
      to: user.email,
      subject: SUBSCRIPTION_ENDED_SUBJECT,
      html,
      purpose: "transactional",
    });
  } catch (e) {
    console.error("[downgrade-to-free] subscription-ended email failed (non-blocking):", e);
  }
}
