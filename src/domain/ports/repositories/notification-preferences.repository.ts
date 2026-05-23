import type { NotificationPreferencesEntity } from "@/domain/entities/notification-preferences.entity";

export interface NotificationPreferencesRepository {
  findForUser(userId: string): Promise<NotificationPreferencesEntity | null>;
  upsert(input: {
    userId: string;
    pushEnabled: boolean;
    emailEnabled: boolean;
    debtDueEnabled: boolean;
    assetPriceEnabled: boolean;
    monthlySummaryEnabled: boolean;
    promotionsEnabled: boolean;
    newsEnabled: boolean;
    newsletterEnabled: boolean;
  }): Promise<NotificationPreferencesEntity>;
}
