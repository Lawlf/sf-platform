import { BillingProviderError } from "@/domain/errors/billing-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { err, ok, type Result } from "@/shared/errors/result";

import { downgradeToFree } from "./downgrade-to-free.use-case";

export interface RevokeProManuallyInput {
  userId: string;
  adminId: string;
}

export interface RevokeProManuallyDeps {
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  email: EmailService;
  clock: Clock;
  appUrl: string;
}

/** Cancels a manual cortesia subscription and downgrades the user to Free. */
export async function revokeProManually(
  deps: RevokeProManuallyDeps,
  input: RevokeProManuallyInput,
): Promise<Result<void, BillingProviderError>> {
  const active = await deps.subscriptions.findActiveByUserId(input.userId);
  if (!active || active.provider !== "manual") {
    return err(new BillingProviderError("No active manual subscription to revoke"));
  }
  const now = deps.clock.now();
  await deps.subscriptions.save({
    ...active,
    status: "canceled",
    cancelAtPeriodEnd: false,
    canceledAt: now,
    endedAt: now,
    updatedAt: now,
  });
  await downgradeToFree(
    {
      users: deps.users,
      subscriptions: deps.subscriptions,
      email: deps.email,
      clock: deps.clock,
      appUrl: deps.appUrl,
    },
    input.userId,
  );
  return ok(undefined);
}
