import { and, desc, eq, sql } from "drizzle-orm";

import type { EntityAttachmentEntity } from "@/domain/entities/entity-attachment.entity";
import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

import { getDb } from "../client";
import {
  entityAttachments,
  type EntityAttachmentRow,
} from "../schema/entity-attachments.schema";

function rowToEntity(row: EntityAttachmentRow): EntityAttachmentEntity {
  return {
    id: row.id,
    userId: row.userId,
    entityType: row.entityType as AttachableEntityType,
    entityId: row.entityId,
    storageKey: row.storageKey,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  };
}

export class DrizzleEntityAttachmentRepository implements EntityAttachmentRepository {
  async add(attachment: EntityAttachmentEntity): Promise<void> {
    await getDb().insert(entityAttachments).values({
      id: attachment.id,
      userId: attachment.userId,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      storageKey: attachment.storageKey,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
    });
  }

  async findById(id: string, userId: string): Promise<EntityAttachmentEntity | null> {
    const rows = await getDb()
      .select()
      .from(entityAttachments)
      .where(and(eq(entityAttachments.id, id), eq(entityAttachments.userId, userId)))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listForEntity(
    userId: string,
    entityType: AttachableEntityType,
    entityId: string,
  ): Promise<EntityAttachmentEntity[]> {
    const rows = await getDb()
      .select()
      .from(entityAttachments)
      .where(
        and(
          eq(entityAttachments.userId, userId),
          eq(entityAttachments.entityType, entityType),
          eq(entityAttachments.entityId, entityId),
        ),
      )
      .orderBy(desc(entityAttachments.createdAt));
    return rows.map(rowToEntity);
  }

  async remove(id: string, userId: string): Promise<void> {
    await getDb()
      .delete(entityAttachments)
      .where(and(eq(entityAttachments.id, id), eq(entityAttachments.userId, userId)));
  }

  async totalBytesForUser(userId: string): Promise<number> {
    const rows = await getDb()
      .select({ total: sql<string>`coalesce(sum(${entityAttachments.sizeBytes}), 0)` })
      .from(entityAttachments)
      .where(eq(entityAttachments.userId, userId));
    return Number(rows[0]?.total ?? 0);
  }
}
