import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { mcpConnections } from "./mcp-connections.schema";

export const mcpRefreshTokens = pgTable(
  "mcp_refresh_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => mcpConnections.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rotatedFromHash: text("rotated_from_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    connIdx: index("mcp_refresh_tokens_connection_idx").on(table.connectionId),
  }),
);

export type McpRefreshTokenRow = typeof mcpRefreshTokens.$inferSelect;
