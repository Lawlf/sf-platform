"use server";

import { z } from "zod";

import { DEBT_DUE_DAYS_BEFORE_DEFAULT } from "@/domain/entities/notification-preferences.entity";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  debtDueEnabled: z.boolean(),
  assetPriceEnabled: z.boolean(),
  monthlySummaryEnabled: z.boolean(),
  promotionsEnabled: z.boolean(),
  newsEnabled: z.boolean(),
  newsletterEnabled: z.boolean(),
});

export const updateNotificationPreferencesAction = action({
  schema,
  revalidates: ["notificationPrefs"],
  handler: async (data, { userId }) => {
    const user = await requireUser();
    const repo = repos.notificationPreferences;
    const existing = await repo.findForUser(userId);
    const debtDueDaysBefore = existing?.debtDueDaysBefore ?? DEBT_DUE_DAYS_BEFORE_DEFAULT;

    if (!user.isPro) {
      await repo.upsert({
        userId,
        pushEnabled: existing?.pushEnabled ?? true,
        emailEnabled: data.emailEnabled,
        debtDueEnabled: existing?.debtDueEnabled ?? true,
        debtDueDaysBefore,
        assetPriceEnabled: existing?.assetPriceEnabled ?? true,
        monthlySummaryEnabled: existing?.monthlySummaryEnabled ?? true,
        promotionsEnabled: data.promotionsEnabled,
        newsEnabled: data.newsEnabled,
        newsletterEnabled: data.newsletterEnabled,
      });
      return;
    }

    await repo.upsert({
      userId,
      pushEnabled: data.pushEnabled,
      emailEnabled: data.emailEnabled,
      debtDueEnabled: data.debtDueEnabled,
      debtDueDaysBefore,
      assetPriceEnabled: data.assetPriceEnabled,
      monthlySummaryEnabled: data.monthlySummaryEnabled,
      promotionsEnabled: data.promotionsEnabled,
      newsEnabled: data.newsEnabled,
      newsletterEnabled: data.newsletterEnabled,
    });
  },
});
