import type { NotificationPreferencesEntity } from "@/domain/entities/notification-preferences.entity";
import type { NotificationPreferencesRepository } from "@/domain/ports/repositories/notification-preferences.repository";
import type { EmailCategory } from "@/infrastructure/email/unsubscribe-token";

export interface UnsubscribeFromEmailsDeps {
  preferences: NotificationPreferencesRepository;
}

const FIELD_BY_CATEGORY: Record<
  Exclude<EmailCategory, "all">,
  "monthlySummaryEnabled" | "promotionsEnabled" | "newsletterEnabled" | "newsEnabled"
> = {
  monthly: "monthlySummaryEnabled",
  promotions: "promotionsEnabled",
  newsletter: "newsletterEnabled",
  news: "newsEnabled",
};

function defaults(userId: string): Omit<NotificationPreferencesEntity, "updatedAt"> {
  return {
    userId,
    pushEnabled: true,
    emailEnabled: true,
    debtDueEnabled: true,
    debtDueDaysBefore: 3,
    assetPriceEnabled: true,
    monthlySummaryEnabled: true,
    promotionsEnabled: true,
    newsEnabled: true,
    newsletterEnabled: true,
  };
}

export async function unsubscribeFromEmails(
  deps: UnsubscribeFromEmailsDeps,
  input: { userId: string; category: EmailCategory },
): Promise<void> {
  const existing = await deps.preferences.findForUser(input.userId);
  const base = existing ?? defaults(input.userId);

  const next = {
    userId: input.userId,
    pushEnabled: base.pushEnabled,
    emailEnabled: base.emailEnabled,
    debtDueEnabled: base.debtDueEnabled,
    debtDueDaysBefore: base.debtDueDaysBefore,
    assetPriceEnabled: base.assetPriceEnabled,
    monthlySummaryEnabled: base.monthlySummaryEnabled,
    promotionsEnabled: base.promotionsEnabled,
    newsEnabled: base.newsEnabled,
    newsletterEnabled: base.newsletterEnabled,
  };

  if (input.category === "all") {
    next.emailEnabled = false;
  } else {
    next[FIELD_BY_CATEGORY[input.category]] = false;
  }

  await deps.preferences.upsert(next);
}
