import { eq } from "drizzle-orm";

import type { NotificationPreferencesEntity } from "@/domain/entities/notification-preferences.entity";
import type { NotificationPreferencesRepository } from "@/domain/ports/repositories/notification-preferences.repository";

import { getDb } from "../client";
import {
  notificationPreferences,
  type NotificationPreferenceRow,
} from "../schema/notification-preferences.schema";

function toEntity(row: NotificationPreferenceRow): NotificationPreferencesEntity {
  return {
    userId: row.userId,
    pushEnabled: row.pushEnabled,
    emailEnabled: row.emailEnabled,
    debtDueEnabled: row.debtDueEnabled,
    debtDueDaysBefore: row.debtDueDaysBefore,
    assetPriceEnabled: row.assetPriceEnabled,
    monthlySummaryEnabled: row.monthlySummaryEnabled,
    promotionsEnabled: row.promotionsEnabled,
    newsEnabled: row.newsEnabled,
    newsletterEnabled: row.newsletterEnabled,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleNotificationPreferencesRepository
  implements NotificationPreferencesRepository
{
  async findForUser(userId: string): Promise<NotificationPreferencesEntity | null> {
    const rows = await getDb()
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async upsert(input: {
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
  }): Promise<NotificationPreferencesEntity> {
    const rows = await getDb()
      .insert(notificationPreferences)
      .values({
        userId: input.userId,
        pushEnabled: input.pushEnabled,
        emailEnabled: input.emailEnabled,
        debtDueEnabled: input.debtDueEnabled,
        debtDueDaysBefore: input.debtDueDaysBefore,
        assetPriceEnabled: input.assetPriceEnabled,
        monthlySummaryEnabled: input.monthlySummaryEnabled,
        promotionsEnabled: input.promotionsEnabled,
        newsEnabled: input.newsEnabled,
        newsletterEnabled: input.newsletterEnabled,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          pushEnabled: input.pushEnabled,
          emailEnabled: input.emailEnabled,
          debtDueEnabled: input.debtDueEnabled,
          debtDueDaysBefore: input.debtDueDaysBefore,
          assetPriceEnabled: input.assetPriceEnabled,
          monthlySummaryEnabled: input.monthlySummaryEnabled,
          promotionsEnabled: input.promotionsEnabled,
          newsEnabled: input.newsEnabled,
          newsletterEnabled: input.newsletterEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert notification_preferences: no row returned");
    return toEntity(row);
  }
}
