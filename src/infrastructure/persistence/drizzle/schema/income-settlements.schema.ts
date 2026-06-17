import { sql } from "drizzle-orm";
import { bigint, date, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { incomes } from "./incomes.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const incomeSettlements = pgTable(
  "income_settlements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    incomeId: uuid("income_id")
      .notNull()
      .references(() => incomes.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    status: text("status").notNull(),
    adjustedAmountCents: bigint("adjusted_amount_cents", { mode: "bigint" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.incomeId, t.month] }),
    profileIdx: index("income_settlements_profile_id_idx").on(t.profileId),
  }),
);

export type IncomeSettlementRow = typeof incomeSettlements.$inferSelect;
export type NewIncomeSettlementRow = typeof incomeSettlements.$inferInsert;
