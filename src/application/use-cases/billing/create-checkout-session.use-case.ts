import { isPlanCheckoutReady, LIFETIME_LIMIT } from "@/domain/entities/plan.entity";
import { isSubscriptionActive } from "@/domain/entities/subscription.entity";
import { UserNotFound } from "@/domain/errors/auth-errors";
import {
  AlreadySubscribedError,
  BillingProviderError,
  LifetimeSoldOutError,
  PlanNotCheckoutReadyError,
  PlanNotFoundError,
} from "@/domain/errors/billing-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { BillingProvider } from "@/domain/ports/external/billing-provider.port";
import type { PlanRepository } from "@/domain/ports/repositories/plan.repository";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import { err, ok, type Result } from "@/shared/errors";

export const DEFAULT_PLAN_SLUG = "pro-monthly";

export interface CreateCheckoutSessionDeps {
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  plans: PlanRepository;
  billing: BillingProvider;
  clock: Clock;
  appUrl: string;
}

export interface CreateCheckoutSessionInput {
  userId: string;
  planSlug?: string;
}

export type CreateCheckoutSessionError =
  | UserNotFound
  | AlreadySubscribedError
  | PlanNotFoundError
  | PlanNotCheckoutReadyError
  | LifetimeSoldOutError
  | BillingProviderError;

export async function createCheckoutSession(
  deps: CreateCheckoutSessionDeps,
  input: CreateCheckoutSessionInput,
): Promise<Result<{ redirectUrl: string }, CreateCheckoutSessionError>> {
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new UserNotFound("Usuário não encontrado."));

  const existing = await deps.subscriptions.findActiveByUserId(user.id);
  if (existing && isSubscriptionActive(existing, deps.clock.now())) {
    return err(new AlreadySubscribedError("Você já tem uma assinatura ativa."));
  }

  const slug = input.planSlug ?? DEFAULT_PLAN_SLUG;
  const plan = await deps.plans.findBySlug(slug);
  if (!plan) return err(new PlanNotFoundError(`Plano "${slug}" não encontrado.`));
  if (!isPlanCheckoutReady(plan) || plan.providerPriceId === null) {
    return err(
      new PlanNotCheckoutReadyError(
        `Plano "${slug}" sem price provider configurado ou inativo.`,
      ),
    );
  }

  if (plan.billingInterval === "lifetime") {
    const sold = await deps.subscriptions.countByPlanId(plan.id);
    if (sold >= LIFETIME_LIMIT) {
      return err(new LifetimeSoldOutError("Vitalício esgotado."));
    }
  }

  const checkoutMode = plan.billingInterval === "lifetime" ? "payment" : "subscription";

  try {
    const out = await deps.billing.createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      priceId: plan.providerPriceId,
      mode: checkoutMode,
      successUrl: `${deps.appUrl.replace(/\/$/, "")}/app/configuracoes/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${deps.appUrl.replace(/\/$/, "")}/app/configuracoes/planos?canceled=1`,
      metadata: { userId: user.id, planId: plan.id, planSlug: plan.slug },
    });
    return ok({ redirectUrl: out.redirectUrl });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[create-checkout-session] Stripe failure:", e);
    return err(
      new BillingProviderError(`Falha ao criar sessão Stripe: ${detail}`, { cause: e }),
    );
  }
}
