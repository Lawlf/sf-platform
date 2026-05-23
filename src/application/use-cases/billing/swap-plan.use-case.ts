import { isPlanCheckoutReady } from "@/domain/entities/plan.entity";
import {
  BillingProviderError,
  NoActiveSubscriptionError,
  PlanNotCheckoutReadyError,
  PlanNotFoundError,
  PlanSwapNotSupportedError,
  SamePlanError,
} from "@/domain/errors/billing-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { BillingProvider } from "@/domain/ports/external/billing-provider.port";
import type { PlanRepository } from "@/domain/ports/repositories/plan.repository";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import { err, ok, type Result } from "@/shared/errors";

export interface SwapPlanDeps {
  subscriptions: SubscriptionRepository;
  plans: PlanRepository;
  billing: BillingProvider;
  clock: Clock;
}

export interface SwapPlanInput {
  userId: string;
  targetPlanSlug: string;
}

export type SwapPlanError =
  | NoActiveSubscriptionError
  | PlanNotFoundError
  | PlanNotCheckoutReadyError
  | SamePlanError
  | PlanSwapNotSupportedError
  | BillingProviderError;

export async function swapPlan(
  deps: SwapPlanDeps,
  input: SwapPlanInput,
): Promise<Result<void, SwapPlanError>> {
  const sub = await deps.subscriptions.findActiveByUserId(input.userId);
  if (!sub) {
    return err(new NoActiveSubscriptionError("Nenhuma assinatura ativa para alterar."));
  }
  if (sub.provider !== "stripe" || !sub.providerSubscriptionId) {
    return err(
      new PlanSwapNotSupportedError(
        "Troca disponível só pra assinaturas Stripe recorrentes.",
      ),
    );
  }

  const targetPlan = await deps.plans.findBySlug(input.targetPlanSlug);
  if (!targetPlan) {
    return err(new PlanNotFoundError(`Plano "${input.targetPlanSlug}" não encontrado.`));
  }
  if (!isPlanCheckoutReady(targetPlan) || !targetPlan.providerPriceId) {
    return err(
      new PlanNotCheckoutReadyError(
        `Plano "${input.targetPlanSlug}" sem price provider ou inativo.`,
      ),
    );
  }
  if (targetPlan.billingInterval === "lifetime") {
    return err(
      new PlanSwapNotSupportedError(
        "Vitalício é cobrança única, use checkout dedicado.",
      ),
    );
  }
  if (sub.planId === targetPlan.id) {
    return err(new SamePlanError("Você já está nesse plano."));
  }

  let snapshot;
  try {
    snapshot = await deps.billing.swapSubscriptionPrice(
      sub.providerSubscriptionId,
      targetPlan.providerPriceId,
    );
  } catch (e) {
    return err(new BillingProviderError("Falha ao trocar plano no Stripe.", { cause: e }));
  }

  sub.planId = targetPlan.id;
  sub.priceCents = targetPlan.priceCents;
  sub.currency = targetPlan.currency;
  sub.status = snapshot.status;
  sub.currentPeriodStart = snapshot.currentPeriodStart;
  sub.currentPeriodEnd = snapshot.currentPeriodEnd;
  sub.cancelAtPeriodEnd = snapshot.cancelAtPeriodEnd;
  sub.canceledAt = snapshot.canceledAt;
  sub.updatedAt = deps.clock.now();
  await deps.subscriptions.save(sub);
  return ok(undefined);
}
