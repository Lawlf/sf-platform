import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { mcpConnections } from "./mcp-connections.schema";
import { users } from "./users.schema";

export const mcpAuditLog = pgTable(
  "mcp_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => mcpConnections.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    scope: text("scope").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    argsRedacted: jsonb("args_redacted").notNull().$type<Record<string, unknown>>(),
    beforeState: jsonb("before_state").$type<Record<string, unknown> | null>(),
    afterState: jsonb("after_state").$type<Record<string, unknown> | null>(),
    reversible: boolean("reversible").notNull().default(false),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    userIdx: index("mcp_audit_log_user_idx").on(table.userId, table.createdAt),
    connIdx: index("mcp_audit_log_connection_idx").on(table.connectionId),
  }),
);

export type McpAuditLogRow = typeof mcpAuditLog.$inferSelect;
