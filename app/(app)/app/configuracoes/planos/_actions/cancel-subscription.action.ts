"use server";

import { revalidatePath } from "next/cache";

import { cancelSubscription } from "@/application/use-cases/billing/cancel-subscription.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors";

export interface CancelSubscriptionResult {
  ok: boolean;
  message?: string;
}

export async function cancelSubscriptionAction(): Promise<CancelSubscriptionResult> {
  const user = await requireUser();
  const r = await cancelSubscription(
    {
      subscriptions: new DrizzleSubscriptionRepository(),
      billing: buildStripeBillingAdapter(),
      clock: new SystemClock(),
    },
    { userId: user.id },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  revalidatePath("/app/configuracoes/planos");
  return { ok: true };
}
