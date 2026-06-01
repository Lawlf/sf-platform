import { sql } from "drizzle-orm";
import { boolean, pgTable, smallint, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  debtDueEnabled: boolean("debt_due_enabled").notNull().default(true),
  // Antecedência do aviso de vencimento (dias). 0 = no dia. Default 3.
  debtDueDaysBefore: smallint("debt_due_days_before").notNull().default(3),
  assetPriceEnabled: boolean("asset_price_enabled").notNull().default(true),
  monthlySummaryEnabled: boolean("monthly_summary_enabled").notNull().default(true),
  // Notificações básicas disponíveis pra qualquer plano (Free + Pro).
  // Promoções: campanhas comerciais e ofertas de upgrade.
  // Novidades: lançamento de features, posts educacionais relevantes.
  // Newsletter: digest periódico enviado por email.
  promotionsEnabled: boolean("promotions_enabled").notNull().default(true),
  newsEnabled: boolean("news_enabled").notNull().default(true),
  newsletterEnabled: boolean("newsletter_enabled").notNull().default(true),
  // Master switch do canal email. Funciona simétrico ao pushEnabled.
  // Dispatcher só envia por email quando este flag estiver true.
  emailEnabled: boolean("email_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type NotificationPreferenceRow = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferenceRow = typeof notificationPreferences.$inferInsert;
