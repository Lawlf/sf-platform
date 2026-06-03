import { and, eq } from "drizzle-orm";

import type { McpWriteIdempotencyRepository } from "@/domain/ports/repositories/mcp-write-idempotency.repository";

import { getDb } from "../client";
import { mcpWriteIdempotency } from "../schema/mcp-write-idempotency.schema";

export class DrizzleMcpWriteIdempotencyRepository implements McpWriteIdempotencyRepository {
  async find(connectionId: string, key: string): Promise<Record<string, unknown> | null> {
    const rows = await getDb()
      .select()
      .from(mcpWriteIdempotency)
      .where(
        and(
          eq(mcpWriteIdempotency.connectionId, connectionId),
          eq(mcpWriteIdempotency.idempotencyKey, key),
        ),
      )
      .limit(1);
    return rows[0]?.result ?? null;
  }

  async save(connectionId: string, key: string, result: Record<string, unknown>): Promise<void> {
    await getDb()
      .insert(mcpWriteIdempotency)
      .values({ connectionId, idempotencyKey: key, result })
      .onConflictDoNothing();
  }
}
