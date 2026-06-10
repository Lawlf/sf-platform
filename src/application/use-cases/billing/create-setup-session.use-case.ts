import { BillingProviderError, NoActiveSubscriptionError } from "@/domain/errors/billing-errors";
import type { BillingProvider } from "@/domain/ports/external/billing-provider.port";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CreateSetupSessionDeps {
  subscriptions: SubscriptionRepositoryPort;
  billing: BillingProvider;
  appUrl: string;
}

export async function createSetupSession(
  deps: CreateSetupSessionDeps,
  input: { userId: string },
): Promise<Result<{ redirectUrl: string }, NoActiveSubscriptionError | BillingProviderError>> {
  const sub = await deps.subscriptions.findActiveByUserId(input.userId);
  if (!sub || !sub.providerCustomerId) {
    return err(new NoActiveSubscriptionError("Sem assinatura ativa para atualizar método."));
  }
  try {
    const out = await deps.billing.createSetupSession({
      userId: input.userId,
      providerCustomerId: sub.providerCustomerId,
      successUrl: `${deps.appUrl.replace(/\/$/, "")}/app/configuracoes/planos?card=ok`,
      cancelUrl: `${deps.appUrl.replace(/\/$/, "")}/app/configuracoes/planos`,
    });
    return ok({ redirectUrl: out.redirectUrl });
  } catch (e) {
    return err(new BillingProviderError("Falha ao criar SetupSession.", { cause: e }));
  }
}
