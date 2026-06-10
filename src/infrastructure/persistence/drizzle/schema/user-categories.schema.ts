import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const userCategories = pgTable(
  "user_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    kind: text("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name"),
    icon: text("icon"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [uniqueIndex("user_categories_user_domain_slug_idx").on(t.userId, t.domain, t.slug)],
);

export type UserCategoryRow = typeof userCategories.$inferSelect;
export type NewUserCategoryRow = typeof userCategories.$inferInsert;
