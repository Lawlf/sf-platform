"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createCheckoutSession } from "@/application/use-cases/billing/create-checkout-session.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { DrizzlePlanRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-plan.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

export interface StartCheckoutResult {
  ok: false;
  message: string;
}

export async function startCheckoutAction(planSlug?: string): Promise<StartCheckoutResult | never> {
  const user = await requireUser();
  const env = loadEnv();
  const r = await createCheckoutSession(
    {
      users: new DrizzleUserRepository(),
      subscriptions: new DrizzleSubscriptionRepository(),
      plans: new DrizzlePlanRepository(),
      billing: buildStripeBillingAdapter(),
      clock: new SystemClock(),
      appUrl: env.NEXT_PUBLIC_APP_URL,
    },
    planSlug !== undefined ? { userId: user.id, planSlug } : { userId: user.id },
  );
  if (isErr(r)) {
    return { ok: false, message: r.error.message };
  }
  redirect(r.value.redirectUrl as Route);
}
