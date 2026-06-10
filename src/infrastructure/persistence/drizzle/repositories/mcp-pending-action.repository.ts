import { and, desc, eq } from "drizzle-orm";

import type {
  McpPendingAction,
  McpPendingActionRepositoryPort,
} from "@/domain/ports/repositories/mcp-pending-action.repository";

import { getDb } from "../client";
import { mcpPendingActions } from "../schema/mcp-pending-actions.schema";

function toEntity(row: typeof mcpPendingActions.$inferSelect): McpPendingAction {
  return {
    id: row.id,
    connectionId: row.connectionId,
    userId: row.userId,
    toolName: row.toolName,
    args: row.args,
    preview: row.preview,
    confirmationTokenHash: row.confirmationTokenHash,
    status: row.status as McpPendingAction["status"],
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  };
}

export class McpPendingActionRepository implements McpPendingActionRepositoryPort {
  async create(input: {
    connectionId: string;
    userId: string;
    toolName: string;
    args: Record<string, unknown>;
    preview: Record<string, unknown>;
    confirmationTokenHash: string;
    expiresAt: Date;
  }): Promise<McpPendingAction> {
    const rows = await getDb()
      .insert(mcpPendingActions)
      .values({
        connectionId: input.connectionId,
        userId: input.userId,
        toolName: input.toolName,
        args: input.args,
        preview: input.preview,
        confirmationTokenHash: input.confirmationTokenHash,
        expiresAt: input.expiresAt,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert mcp pending action: no row returned");
    return toEntity(row);
  }

  async findById(id: string): Promise<McpPendingAction | null> {
    const rows = await getDb()
      .select()
      .from(mcpPendingActions)
      .where(eq(mcpPendingActions.id, id))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<McpPendingAction | null> {
    const rows = await getDb()
      .select()
      .from(mcpPendingActions)
      .where(eq(mcpPendingActions.confirmationTokenHash, tokenHash))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async listPendingForUser(userId: string): Promise<McpPendingAction[]> {
    const rows = await getDb()
      .select()
      .from(mcpPendingActions)
      .where(and(eq(mcpPendingActions.userId, userId), eq(mcpPendingActions.status, "pending")))
      .orderBy(desc(mcpPendingActions.createdAt));
    return rows.map(toEntity);
  }

  async setStatus(id: string, status: McpPendingAction["status"], now: Date): Promise<void> {
    await getDb()
      .update(mcpPendingActions)
      .set({ status, resolvedAt: status === "pending" ? null : now })
      .where(eq(mcpPendingActions.id, id));
  }

  async claim(id: string, now: Date): Promise<boolean> {
    const rows = await getDb()
      .update(mcpPendingActions)
      .set({ status: "executed", resolvedAt: now })
      .where(and(eq(mcpPendingActions.id, id), eq(mcpPendingActions.status, "pending")))
      .returning();
    return rows.length > 0;
  }
}
