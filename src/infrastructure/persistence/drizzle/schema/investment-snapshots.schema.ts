import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const investmentSnapshots = pgTable(
  "investment_snapshots",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    investmentType: text("investment_type").notNull(),
    totalValueCents: bigint("total_value_cents", { mode: "bigint" }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.month, t.investmentType] }),
  }),
);

export type InvestmentSnapshotRow = typeof investmentSnapshots.$inferSelect;
export type NewInvestmentSnapshotRow = typeof investmentSnapshots.$inferInsert;
