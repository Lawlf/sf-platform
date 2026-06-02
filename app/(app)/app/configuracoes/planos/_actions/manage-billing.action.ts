"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createBillingPortalSession } from "@/application/use-cases/billing/create-billing-portal-session.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { loadEnv } from "@/infrastructure/config/env";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

export async function manageBillingAction(): Promise<{ ok: false; message: string } | never> {
  const user = await requireUser();
  const env = loadEnv();
  const r = await createBillingPortalSession(
    {
      subscriptions: new DrizzleSubscriptionRepository(),
      billing: buildStripeBillingAdapter(),
      appUrl: env.NEXT_PUBLIC_APP_URL,
    },
    { userId: user.id },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  redirect(r.value.redirectUrl as Route);
}
