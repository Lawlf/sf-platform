"use server";

import { revalidatePath } from "next/cache";

import { reactivateSubscription } from "@/application/use-cases/billing/reactivate-subscription.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

export async function reactivateSubscriptionAction(): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const r = await reactivateSubscription(
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
