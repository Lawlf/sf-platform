import type { NotificationPreferencesEntity } from "@/domain/entities/notification-preferences.entity";

export interface NotificationPreferencesRepositoryPort {
  findForUser(userId: string): Promise<NotificationPreferencesEntity | null>;
  upsert(input: {
    userId: string;
    pushEnabled: boolean;
    emailEnabled: boolean;
    debtDueEnabled: boolean;
    debtDueDaysBefore: number;
    assetPriceEnabled: boolean;
    monthlySummaryEnabled: boolean;
    promotionsEnabled: boolean;
    newsEnabled: boolean;
    newsletterEnabled: boolean;
  }): Promise<NotificationPreferencesEntity>;
}
