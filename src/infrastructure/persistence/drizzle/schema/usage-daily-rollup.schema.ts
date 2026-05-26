import { sql } from "drizzle-orm";
import { date, index, integer, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const usageDailyRollup = pgTable(
  "usage_daily_rollup",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    activeSeconds: integer("active_seconds").notNull().default(0),
    pingCount: integer("ping_count").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.day] }),
    dayIdx: index("usage_daily_rollup_day_idx").on(table.day),
  }),
);

export type UsageDailyRollupRow = typeof usageDailyRollup.$inferSelect;
export type NewUsageDailyRollupRow = typeof usageDailyRollup.$inferInsert;
