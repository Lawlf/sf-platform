import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

/**
 * Eventos genéricos de feedback do usuário. Qualquer parte do sistema pode pedir
 * feedback e gravar aqui, sem acoplar a uma feature.
 * `surface` identifica de onde veio (ex.: `sim:juros-compostos`).
 * `sentiment` = joinha cima/baixo, nulo quando é sugestão livre (canal "Falar
 * com a gente"). `comment` opcional na joinha, obrigatório quando não há
 * sentiment.
 * `kind` = tipo do contato (problema/sugestao/duvida), só no canal "Falar com a
 * gente"; nulo na joinha. `attachmentKeys` = chaves R2 das imagens anexadas
 * (zero ou mais).
 * `status` = ciclo do ticket no admin. `adminReply`/`answeredAt` = última
 * resposta dada pelo admin (a resposta também vira notificação in-app pro
 * usuário).
 */
export const feedbackSentiment = pgEnum("feedback_sentiment", ["up", "down"]);
export const feedbackStatus = pgEnum("feedback_status", ["aberto", "respondido", "fechado"]);

export const feedbackEvents = pgTable(
  "feedback_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surface: text("surface").notNull(),
    sentiment: feedbackSentiment("sentiment"),
    comment: text("comment"),
    kind: text("kind"),
    attachmentKeys: text("attachment_keys")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: feedbackStatus("status").notNull().default("aberto"),
    adminReply: text("admin_reply"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byUser: index("feedback_events_user_idx").on(t.userId),
    bySurface: index("feedback_events_surface_idx").on(t.surface, t.sentiment),
    byStatus: index("feedback_events_status_idx").on(t.status, t.createdAt),
  }),
);

export type FeedbackEventRow = typeof feedbackEvents.$inferSelect;
export type NewFeedbackEventRow = typeof feedbackEvents.$inferInsert;
