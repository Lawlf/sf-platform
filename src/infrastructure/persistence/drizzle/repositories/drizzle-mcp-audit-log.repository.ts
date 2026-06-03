import { desc, eq } from "drizzle-orm";

import type {
  McpAuditEntry,
  McpAuditLogRepository,
} from "@/domain/ports/repositories/mcp-audit-log.repository";

import { getDb } from "../client";
import { mcpAuditLog } from "../schema/mcp-audit-log.schema";

function toEntity(row: typeof mcpAuditLog.$inferSelect): McpAuditEntry {
  return {
    id: row.id,
    connectionId: row.connectionId,
    userId: row.userId,
    toolName: row.toolName,
    scope: row.scope,
    entityType: row.entityType,
    entityId: row.entityId,
    argsRedacted: row.argsRedacted,
    beforeState: row.beforeState,
    afterState: row.afterState,
    reversible: row.reversible,
    undoneAt: row.undoneAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleMcpAuditLogRepository implements McpAuditLogRepository {
  async record(input: {
    connectionId: string;
    userId: string;
    toolName: string;
    scope: string;
    entityType: string;
    entityId: string | null;
    argsRedacted: Record<string, unknown>;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
    reversible: boolean;
  }): Promise<McpAuditEntry> {
    const rows = await getDb()
      .insert(mcpAuditLog)
      .values({
        connectionId: input.connectionId,
        userId: input.userId,
        toolName: input.toolName,
        scope: input.scope,
        entityType: input.entityType,
        entityId: input.entityId,
        argsRedacted: input.argsRedacted,
        beforeState: input.beforeState,
        afterState: input.afterState,
        reversible: input.reversible,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert mcp audit log: no row returned");
    return toEntity(row);
  }

  async listForUser(userId: string, limit: number): Promise<McpAuditEntry[]> {
    const rows = await getDb()
      .select()
      .from(mcpAuditLog)
      .where(eq(mcpAuditLog.userId, userId))
      .orderBy(desc(mcpAuditLog.createdAt))
      .limit(limit);
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<McpAuditEntry | null> {
    const rows = await getDb().select().from(mcpAuditLog).where(eq(mcpAuditLog.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async markUndone(id: string, now: Date): Promise<void> {
    await getDb().update(mcpAuditLog).set({ undoneAt: now }).where(eq(mcpAuditLog.id, id));
  }
}
