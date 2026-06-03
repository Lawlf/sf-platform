import { sql } from "drizzle-orm";
import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { mcpConnections } from "./mcp-connections.schema";

export const mcpConnectionScopes = pgTable(
  "mcp_connection_scopes",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => mcpConnections.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.connectionId, table.scope] }),
  }),
);

export type McpConnectionScopeRow = typeof mcpConnectionScopes.$inferSelect;
