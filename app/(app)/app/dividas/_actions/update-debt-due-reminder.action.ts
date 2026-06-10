"use server";

import { z } from "zod";

import { normalizeDebtDueDaysBefore } from "@/domain/entities/notification-preferences.entity";
import { repos } from "@/infrastructure/container";
import { action, ActionError } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export const updateDebtDueReminderAction = action({
  schema: z.object({
    enabled: z.boolean(),
    daysBefore: z.number(),
  }),
  revalidates: ["debts", "notificationPrefs"],
  handler: async (input, { userId }) => {
    const user = await requireUser();
    if (!user.isPro) {
      throw new ActionError("Avisos de vencimento são exclusivos do plano Pro.");
    }

    const repo = repos.notificationPreferences;
    const existing = await repo.findForUser(userId);

    await repo.upsert({
      userId,
      pushEnabled: existing?.pushEnabled ?? true,
      emailEnabled: existing?.emailEnabled ?? true,
      debtDueEnabled: input.enabled,
      debtDueDaysBefore: normalizeDebtDueDaysBefore(input.daysBefore),
      assetPriceEnabled: existing?.assetPriceEnabled ?? true,
      monthlySummaryEnabled: existing?.monthlySummaryEnabled ?? true,
      promotionsEnabled: existing?.promotionsEnabled ?? true,
      newsEnabled: existing?.newsEnabled ?? true,
      newsletterEnabled: existing?.newsletterEnabled ?? true,
    });
  },
});
