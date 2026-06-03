import { sql } from "drizzle-orm";
import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.slug] }),
  }),
);

export type UserAchievementRow = typeof userAchievements.$inferSelect;
export type NewUserAchievementRow = typeof userAchievements.$inferInsert;
