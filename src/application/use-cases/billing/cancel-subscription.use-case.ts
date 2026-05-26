import { BillingProviderError, NoActiveSubscriptionError } from "@/domain/errors/billing-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { BillingProvider } from "@/domain/ports/external/billing-provider.port";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CancelSubscriptionDeps {
  subscriptions: SubscriptionRepository;
  billing: BillingProvider;
  clock: Clock;
}

export interface CancelSubscriptionInput {
  userId: string;
}

export async function cancelSubscription(
  deps: CancelSubscriptionDeps,
  input: CancelSubscriptionInput,
): Promise<Result<void, NoActiveSubscriptionError | BillingProviderError>> {
  const sub = await deps.subscriptions.findActiveByUserId(input.userId);
  if (!sub) return err(new NoActiveSubscriptionError("Nenhuma assinatura ativa para cancelar."));

  if (sub.provider === "manual") {
    const now = deps.clock.now();
    sub.cancelAtPeriodEnd = true;
    sub.canceledAt = now;
    sub.updatedAt = now;
    await deps.subscriptions.save(sub);
    return ok(undefined);
  }

  if (!sub.providerSubscriptionId) {
    return err(new BillingProviderError("Assinatura Stripe sem providerSubscriptionId."));
  }

  try {
    await deps.billing.cancelAtPeriodEnd(sub.providerSubscriptionId);
  } catch (e) {
    return err(new BillingProviderError("Falha ao cancelar no Stripe.", { cause: e }));
  }
  const now = deps.clock.now();
  sub.cancelAtPeriodEnd = true;
  sub.canceledAt = now;
  sub.updatedAt = now;
  await deps.subscriptions.save(sub);
  return ok(undefined);
}
