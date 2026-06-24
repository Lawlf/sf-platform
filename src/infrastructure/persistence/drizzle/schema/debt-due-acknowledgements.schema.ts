import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { debts } from "./debts.schema";
import { users } from "./users.schema";

export const debtDueAcknowledgements = pgTable(
  "debt_due_acknowledgements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    cycleIso: text("cycle_iso").notNull(),
    response: text("response").notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    debtCycleUnique: unique("debt_due_ack_debt_cycle_unique").on(t.debtId, t.cycleIso),
    userIdx: index("debt_due_ack_user_idx").on(t.userId),
  }),
);

export type DebtDueAcknowledgementRow = typeof debtDueAcknowledgements.$inferSelect;
export type NewDebtDueAcknowledgementRow = typeof debtDueAcknowledgements.$inferInsert;
