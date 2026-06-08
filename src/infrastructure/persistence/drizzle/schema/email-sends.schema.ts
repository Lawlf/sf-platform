import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

/**
 * Registro de e-mails de ciclo de vida enviados pelo próprio app (não confundir
 * com `email_events`, que guarda webhooks de entrega do Resend). Usado pra:
 * - dedupe: `dedupe_key` único por usuário evita reenvio (cron rerodando, etc).
 * - supressão de cadência: `sent_at` permite segurar um e-mail se outro saiu
 *   pro mesmo usuário há poucos dias.
 */
export const emailSends = pgTable(
  "email_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    dedupeKey: text("dedupe_key"),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userSentIdx: index("email_sends_user_sent_idx").on(table.userId, table.sentAt),
    dedupeIdx: uniqueIndex("email_sends_dedupe_idx")
      .on(table.userId, table.dedupeKey)
      .where(sql`${table.dedupeKey} IS NOT NULL`),
  }),
);

export type EmailSendRow = typeof emailSends.$inferSelect;
export type NewEmailSendRow = typeof emailSends.$inferInsert;
