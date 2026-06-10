import { desc } from "drizzle-orm";

import type {
  AdminAuditLogEntry,
  AdminAuditLogRepositoryPort,
  RecordAuditInput,
} from "@/domain/ports/repositories/admin-audit-log.repository";

import { getDb } from "../client";
import { adminAuditLog, type AdminAuditLogRow } from "../schema/admin-audit-log.schema";

function toEntry(row: AdminAuditLogRow): AdminAuditLogEntry {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    targetUserId: row.targetUserId,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
  };
}

export class AdminAuditLogRepository implements AdminAuditLogRepositoryPort {
  async record(input: RecordAuditInput): Promise<void> {
    await getDb()
      .insert(adminAuditLog)
      .values({
        actorId: input.actorId,
        action: input.action,
        targetUserId: input.targetUserId ?? null,
        metadata: input.metadata ?? {},
      });
  }

  async list(limit: number, offset = 0): Promise<AdminAuditLogEntry[]> {
    const rows = await getDb()
      .select()
      .from(adminAuditLog)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(toEntry);
  }
}
