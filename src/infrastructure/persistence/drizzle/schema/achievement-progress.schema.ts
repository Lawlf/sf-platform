import { sql } from "drizzle-orm";
import { pgTable, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const achievementProgress = pgTable(
  "achievement_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    qualifiedMonths: smallint("qualified_months").notNull().default(0),
    lastQualifiedMonth: text("last_qualified_month"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.slug] }),
  }),
);

export type AchievementProgressRow = typeof achievementProgress.$inferSelect;
export type NewAchievementProgressRow = typeof achievementProgress.$inferInsert;
