"use server";

import { z } from "zod";

import { verifyGooglePlayPurchase } from "@/application/use-cases/billing/verify-google-play-purchase.use-case";
import { buildGooglePlayBillingAdapter } from "@/infrastructure/billing/google-play/google-play-billing.adapter";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import { action, unwrap } from "@/presentation/actions/action";

export const verifyGooglePlayPurchaseAction = action({
  schema: z.object({
    sku: z.string().min(1),
    purchaseToken: z.string().min(1),
  }),
  revalidatePaths: () => ["/app/configuracoes/planos", "/app"],
  handler: async ({ sku, purchaseToken }, { userId }) => {
    const env = loadEnv();
    return unwrap(
      await verifyGooglePlayPurchase(
        {
          subscriptions: repos.subscriptions,
          payments: repos.payments,
          plans: repos.plans,
          users: repos.users,
          email: new ResendEmailService(),
          clock,
          appUrl: env.NEXT_PUBLIC_APP_URL,
          play: buildGooglePlayBillingAdapter(),
        },
        { userId, sku, purchaseToken },
      ),
    );
  },
});
