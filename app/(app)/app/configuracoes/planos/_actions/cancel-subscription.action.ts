"use server";

import { z } from "zod";

import { cancelSubscription } from "@/application/use-cases/billing/cancel-subscription.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";
import { isUserSteppedUp } from "@/presentation/http/middleware/require-user-stepup";

export const cancelSubscriptionAction = action({
  schema: z.void(),
  revalidates: ["billing"],
  handler: async (_input, { userId }) => {
    if (!(await isUserSteppedUp(userId))) return { stepupRequired: true };
    unwrap(
      await cancelSubscription(
        {
          subscriptions: repos.subscriptions,
          billing: buildStripeBillingAdapter(),
          clock,
        },
        { userId },
      ),
    );
    return { stepupRequired: false };
  },
});
