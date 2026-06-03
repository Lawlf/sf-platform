import { and, desc, eq } from "drizzle-orm";

import type { McpScope } from "@/domain/mcp/scopes";
import type {
  McpConnection,
  McpConnectionRepository,
} from "@/domain/ports/repositories/mcp-connection.repository";

import { getDb } from "../client";
import { mcpConnectionScopes } from "../schema/mcp-connection-scopes.schema";
import { mcpConnections } from "../schema/mcp-connections.schema";

function toEntity(row: typeof mcpConnections.$inferSelect): McpConnection {
  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    clientName: row.clientName,
    status: row.status as "active" | "revoked",
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  };
}

export class DrizzleMcpConnectionRepository implements McpConnectionRepository {
  async create(input: {
    userId: string;
    clientId: string;
    clientName: string;
    scopes: McpScope[];
  }): Promise<McpConnection> {
    const rows = await getDb()
      .insert(mcpConnections)
      .values({ userId: input.userId, clientId: input.clientId, clientName: input.clientName })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert mcp connection");
    if (input.scopes.length > 0) {
      await getDb()
        .insert(mcpConnectionScopes)
        .values(input.scopes.map((scope) => ({ connectionId: row.id, scope })));
    }
    return toEntity(row);
  }

  async findById(id: string): Promise<McpConnection | null> {
    const rows = await getDb()
      .select()
      .from(mcpConnections)
      .where(eq(mcpConnections.id, id))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async listForUser(userId: string): Promise<McpConnection[]> {
    const rows = await getDb()
      .select()
      .from(mcpConnections)
      .where(eq(mcpConnections.userId, userId))
      .orderBy(desc(mcpConnections.lastUsedAt));
    return rows.map(toEntity);
  }

  async listScopes(connectionId: string): Promise<McpScope[]> {
    const rows = await getDb()
      .select()
      .from(mcpConnectionScopes)
      .where(eq(mcpConnectionScopes.connectionId, connectionId));
    return rows.map((r) => r.scope as McpScope);
  }

  async revoke(id: string, now: Date): Promise<void> {
    await getDb()
      .update(mcpConnections)
      .set({ status: "revoked", revokedAt: now })
      .where(eq(mcpConnections.id, id));
  }

  async addScope(connectionId: string, scope: McpScope): Promise<void> {
    await getDb()
      .insert(mcpConnectionScopes)
      .values({ connectionId, scope })
      .onConflictDoNothing();
  }

  async removeScope(connectionId: string, scope: McpScope): Promise<void> {
    await getDb()
      .delete(mcpConnectionScopes)
      .where(
        and(eq(mcpConnectionScopes.connectionId, connectionId), eq(mcpConnectionScopes.scope, scope)),
      );
  }

  async touch(id: string, now: Date): Promise<void> {
    await getDb().update(mcpConnections).set({ lastUsedAt: now }).where(eq(mcpConnections.id, id));
  }
}
