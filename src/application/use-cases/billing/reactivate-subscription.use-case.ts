import { BillingProviderError, NoActiveSubscriptionError } from "@/domain/errors/billing-errors";
import type { BillingProvider } from "@/domain/ports/external/billing-provider.port";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ReactivateSubscriptionDeps {
  subscriptions: SubscriptionRepositoryPort;
  billing: BillingProvider;
  clock: { now: () => Date };
}

export async function reactivateSubscription(
  deps: ReactivateSubscriptionDeps,
  input: { userId: string },
): Promise<Result<void, NoActiveSubscriptionError | BillingProviderError>> {
  const sub = await deps.subscriptions.findActiveByUserId(input.userId);
  if (!sub) return err(new NoActiveSubscriptionError("Nenhuma assinatura para reativar."));
  if (!sub.cancelAtPeriodEnd) return ok(undefined);

  if (sub.provider === "manual") {
    sub.cancelAtPeriodEnd = false;
    sub.canceledAt = null;
    sub.updatedAt = deps.clock.now();
    await deps.subscriptions.save(sub);
    return ok(undefined);
  }
  if (!sub.providerSubscriptionId) {
    return err(new BillingProviderError("Assinatura Stripe sem providerSubscriptionId."));
  }
  try {
    await deps.billing.reactivate(sub.providerSubscriptionId);
  } catch (e) {
    return err(new BillingProviderError("Falha ao reativar no Stripe.", { cause: e }));
  }
  sub.cancelAtPeriodEnd = false;
  sub.canceledAt = null;
  sub.updatedAt = deps.clock.now();
  await deps.subscriptions.save(sub);
  return ok(undefined);
}
