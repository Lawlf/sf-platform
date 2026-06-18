import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const monthClosings = pgTable(
  "month_closings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    baselineNetWorthCents: bigint("baseline_net_worth_cents", {
      mode: "bigint",
    }).notNull(),
    endNetWorthCents: bigint("end_net_worth_cents", { mode: "bigint" }).notNull(),
    theoreticalFreeCashFlowCents: bigint("theoretical_free_cash_flow_cents", {
      mode: "bigint",
    }).notNull(),
    leakCents: bigint("leak_cents", { mode: "bigint" }).notNull(),
    endDebtBalanceCents: bigint("end_debt_balance_cents", { mode: "bigint" }),
    endReserveCents: bigint("end_reserve_cents", { mode: "bigint" }),
    committedPctBps: integer("committed_pct_bps"),
    closedAt: timestamp("closed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.profileId, t.month] }),
    profileIdx: index("month_closings_profile_id_idx").on(t.profileId),
  }),
);

export type MonthClosingRow = typeof monthClosings.$inferSelect;
export type NewMonthClosingRow = typeof monthClosings.$inferInsert;
