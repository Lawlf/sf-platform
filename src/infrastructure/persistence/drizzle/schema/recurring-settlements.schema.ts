import { sql } from "drizzle-orm";
import { date, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { debts } from "./debts.schema";
import { users } from "./users.schema";

export const recurringSettlements = pgTable(
  "recurring_settlements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    status: text("status").notNull(),
    createdDebtId: uuid("created_debt_id").references(() => debts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.debtId, t.month] }),
  }),
);

export type RecurringSettlementRow = typeof recurringSettlements.$inferSelect;
export type NewRecurringSettlementRow = typeof recurringSettlements.$inferInsert;
