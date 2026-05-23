"use server";

import { revalidatePath } from "next/cache";

import { swapPlan } from "@/application/use-cases/billing/swap-plan.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzlePlanRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-plan.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors";

export interface SwapPlanResult {
  ok: boolean;
  message?: string;
}

export async function swapPlanAction(targetPlanSlug: string): Promise<SwapPlanResult> {
  const user = await requireUser();
  const r = await swapPlan(
    {
      subscriptions: new DrizzleSubscriptionRepository(),
      plans: new DrizzlePlanRepository(),
      billing: buildStripeBillingAdapter(),
      clock: new SystemClock(),
    },
    { userId: user.id, targetPlanSlug },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  revalidatePath("/app/configuracoes/planos");
  revalidatePath("/app/configuracoes/planos/ajustar");
  return { ok: true };
}
