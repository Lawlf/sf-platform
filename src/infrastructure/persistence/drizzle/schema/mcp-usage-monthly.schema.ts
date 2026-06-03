import { integer, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const mcpUsageMonthly = pgTable(
  "mcp_usage_monthly",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.period] }),
  }),
);

export type McpUsageMonthlyRow = typeof mcpUsageMonthly.$inferSelect;
