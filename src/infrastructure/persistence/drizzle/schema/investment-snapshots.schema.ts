import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const investmentSnapshots = pgTable(
  "investment_snapshots",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    investmentType: text("investment_type").notNull(),
    totalValueCents: bigint("total_value_cents", { mode: "bigint" }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.profileId, t.month, t.investmentType] }),
    profileIdx: index("investment_snapshots_profile_id_idx").on(t.profileId),
  }),
);

export type InvestmentSnapshotRow = typeof investmentSnapshots.$inferSelect;
export type NewInvestmentSnapshotRow = typeof investmentSnapshots.$inferInsert;
