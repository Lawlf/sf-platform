import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { mcpConnections } from "./mcp-connections.schema";
import { users } from "./users.schema";

export const mcpPendingActions = pgTable(
  "mcp_pending_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => mcpConnections.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    args: jsonb("args").notNull().$type<Record<string, unknown>>(),
    preview: jsonb("preview").notNull().$type<Record<string, unknown>>(),
    confirmationTokenHash: text("confirmation_token_hash").notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    userStatusIdx: index("mcp_pending_user_status_idx").on(table.userId, table.status),
  }),
);

export type McpPendingActionRow = typeof mcpPendingActions.$inferSelect;
