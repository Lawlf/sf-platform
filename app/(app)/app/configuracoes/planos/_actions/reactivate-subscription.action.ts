"use server";

import { z } from "zod";

import { reactivateSubscription } from "@/application/use-cases/billing/reactivate-subscription.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const reactivateSubscriptionAction = action({
  schema: z.void(),
  revalidates: ["billing"],
  handler: async (_input, { userId }) => {
    unwrap(
      await reactivateSubscription(
        {
          subscriptions: repos.subscriptions,
          billing: buildStripeBillingAdapter(),
          clock,
        },
        { userId },
      ),
    );
  },
});
