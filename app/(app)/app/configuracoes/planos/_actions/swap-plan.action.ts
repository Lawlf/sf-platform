"use server";

import { z } from "zod";

import { swapPlan } from "@/application/use-cases/billing/swap-plan.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";
import { isUserSteppedUp } from "@/presentation/http/middleware/require-user-stepup";

export const swapPlanAction = action({
  schema: z.string(),
  revalidates: ["billing"],
  handler: async (targetPlanSlug, { userId }) => {
    if (!(await isUserSteppedUp(userId))) return { stepupRequired: true };
    unwrap(
      await swapPlan(
        {
          subscriptions: repos.subscriptions,
          plans: repos.plans,
          billing: buildStripeBillingAdapter(),
          clock,
        },
        { userId, targetPlanSlug },
      ),
    );
    return { stepupRequired: false };
  },
  revalidatePaths: () => ["/app/configuracoes/planos/ajustar"],
});
