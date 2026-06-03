import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { mcpConnections } from "./mcp-connections.schema";

export const mcpAccessTokens = pgTable(
  "mcp_access_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => mcpConnections.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    connIdx: index("mcp_access_tokens_connection_idx").on(table.connectionId),
  }),
);

export type McpAccessTokenRow = typeof mcpAccessTokens.$inferSelect;
