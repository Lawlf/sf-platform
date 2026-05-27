import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trilhaSlug: text("trilha_slug").notNull(),
    moduleNum: integer("module_num").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("module_progress_user_idx").on(table.userId),
    uniqueUserModule: unique("module_progress_user_module_uniq").on(
      table.userId,
      table.trilhaSlug,
      table.moduleNum,
    ),
  }),
);

export type ModuleProgressRow = typeof moduleProgress.$inferSelect;
export type NewModuleProgressRow = typeof moduleProgress.$inferInsert;
