"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSetupSession } from "@/application/use-cases/billing/create-setup-session.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { loadEnv } from "@/infrastructure/config/env";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const updatePaymentMethodAction = action({
  schema: z.void(),
  handler: async (_input, { userId }) => {
    const env = loadEnv();
    const r = unwrap(
      await createSetupSession(
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
