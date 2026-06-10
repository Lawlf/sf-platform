"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createBillingPortalSession } from "@/application/use-cases/billing/create-billing-portal-session.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { loadEnv } from "@/infrastructure/config/env";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const manageBillingAction = action({
  schema: z.void(),
  handler: async (_input, { userId }) => {
    const env = loadEnv();
    const r = unwrap(
      await createBillingPortalSession(
        {
          subscriptions: repos.subscriptions,
          billing: buildStripeBillingAdapter(),
          appUrl: env.NEXT_PUBLIC_APP_URL,
        },
        { userId },
      ),
    );
    redirect(r.redirectUrl as Route);
  },
});
