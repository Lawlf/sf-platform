import { sql } from "drizzle-orm";
import { date, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { debts } from "./debts.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const recurringSettlements = pgTable(
  "recurring_settlements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
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
    profileIdx: index("recurring_settlements_profile_id_idx").on(t.profileId),
  }),
);

export type RecurringSettlementRow = typeof recurringSettlements.$inferSelect;
export type NewRecurringSettlementRow = typeof recurringSettlements.$inferInsert;
