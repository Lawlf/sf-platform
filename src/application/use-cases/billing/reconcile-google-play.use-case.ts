import type { PaymentProvider } from "@/domain/entities/subscription.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { ProviderSubscriptionSnapshot } from "@/domain/ports/external/billing-provider.port";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";

import { activatePro } from "./activate-pro.use-case";
import { downgradeToFree } from "./downgrade-to-free.use-case";

export interface GooglePlayReconcileGateway {
  readonly provider: PaymentProvider;
  getSubscription(purchaseToken: string): Promise<ProviderSubscriptionSnapshot>;
}

export interface ReconcileGooglePlayDeps {
  subscriptions: SubscriptionRepositoryPort;
  users: UserRepositoryPort;
  email: EmailService;
  clock: Clock;
  appUrl: string;
  play: GooglePlayReconcileGateway;
}

export interface ReconcileGooglePlayResult {
  checked: number;
  downgraded: number;
  errors: number;
}

const ACTIVE_STATUSES = new Set(["active", "past_due"]);

export async function reconcileGooglePlay(
  deps: ReconcileGooglePlayDeps,
): Promise<ReconcileGooglePlayResult> {
  const subs = await deps.subscriptions.findLiveByProvider(deps.play.provider);
  let downgraded = 0;
  let errors = 0;

  for (const sub of subs) {
    if (!sub.providerSubscriptionId) continue;
    try {
      const snapshot = await deps.play.getSubscription(sub.providerSubscriptionId);
      sub.status = snapshot.status;
      sub.currentPeriodStart = snapshot.currentPeriodStart;
      sub.currentPeriodEnd = snapshot.currentPeriodEnd;
      sub.cancelAtPeriodEnd = snapshot.cancelAtPeriodEnd;
      sub.canceledAt = snapshot.canceledAt;
      sub.endedAt = snapshot.endedAt;
      sub.updatedAt = deps.clock.now();
      await deps.subscriptions.save(sub);

      if (ACTIVE_STATUSES.has(snapshot.status)) {
        await activatePro(
          { users: deps.users, email: deps.email, clock: deps.clock, appUrl: deps.appUrl },
          sub.userId,
        );
      } else {
        await downgradeToFree(
          {
            users: deps.users,
            subscriptions: deps.subscriptions,
            email: deps.email,
            clock: deps.clock,
            appUrl: deps.appUrl,
          },
          sub.userId,
        );
        downgraded += 1;
      }
    } catch (e) {
      errors += 1;
      console.error("[reconcile-google-play] failed for subscription", sub.id, e);
    }
  }

  return { checked: subs.length, downgraded, errors };
}
