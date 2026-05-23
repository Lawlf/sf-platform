import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Eventos disparados pelo webhook do Resend.
 * Eventos típicos: `email.sent`, `email.delivered`, `email.opened`,
 * `email.clicked`, `email.bounced`, `email.complained`.
 * `email_id` = id da mensagem retornado pelo Resend; correlaciona múltiplos
 * eventos da mesma mensagem.
 * `payload` = corpo bruto do evento pra debug + futuros campos.
 */
export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailId: text("email_id").notNull(),
    toEmail: text("to_email").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    emailIdIdx: index("email_events_email_id_idx").on(table.emailId, table.eventType),
    toEmailIdx: index("email_events_to_email_idx").on(table.toEmail, table.eventType),
  }),
);

export type EmailEventRow = typeof emailEvents.$inferSelect;
export type NewEmailEventRow = typeof emailEvents.$inferInsert;
