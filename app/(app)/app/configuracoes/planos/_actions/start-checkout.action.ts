"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createCheckoutSession } from "@/application/use-cases/billing/create-checkout-session.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const startCheckoutAction = action({
  schema: z.string().optional(),
  handler: async (planSlug, { userId }) => {
    const env = loadEnv();
    const r = unwrap(
      await createCheckoutSession(
        {
          users: repos.users,
          subscriptions: repos.subscriptions,
          plans: repos.plans,
          billing: buildStripeBillingAdapter(),
          clock,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        },
        planSlug !== undefined ? { userId, planSlug } : { userId },
      ),
    );
    redirect(r.redirectUrl as Route);
  },
});
