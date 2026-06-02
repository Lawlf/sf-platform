import { BillingProviderError, NoActiveSubscriptionError } from "@/domain/errors/billing-errors";
import type { BillingProvider } from "@/domain/ports/external/billing-provider.port";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CreateBillingPortalSessionDeps {
  subscriptions: SubscriptionRepository;
  billing: BillingProvider;
  appUrl: string;
}

/**
 * Opens the hosted billing portal so a past_due customer can pay the open
 * invoice (retry) and/or swap the card. Requires a stripe customer id on the
 * active subscription.
 */
export async function createBillingPortalSession(
  deps: CreateBillingPortalSessionDeps,
  input: { userId: string },
): Promise<Result<{ redirectUrl: string }, NoActiveSubscriptionError | BillingProviderError>> {
  const sub = await deps.subscriptions.findActiveByUserId(input.userId);
  if (!sub || !sub.providerCustomerId) {
    return err(new NoActiveSubscriptionError("Sem assinatura ativa para gerenciar cobrança."));
  }
  try {
    const out = await deps.billing.createBillingPortalSession({
      providerCustomerId: sub.providerCustomerId,
      returnUrl: `${deps.appUrl.replace(/\/$/, "")}/app/configuracoes/planos`,
    });
    return ok({ redirectUrl: out.url });
  } catch (e) {
    return err(new BillingProviderError("Falha ao abrir portal de cobrança.", { cause: e }));
  }
}
