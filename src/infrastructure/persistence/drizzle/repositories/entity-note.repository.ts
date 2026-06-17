import { and, eq, inArray } from "drizzle-orm";

import type { EntityNoteEntity } from "@/domain/entities/entity-note.entity";
import type { EntityNoteRepositoryPort } from "@/domain/ports/repositories/entity-note.repository";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

import { getDb } from "../client";
import { entityNotes, type EntityNoteRow } from "../schema/entity-notes.schema";

function rowToEntity(row: EntityNoteRow): EntityNoteEntity {
  return {
    id: row.id,
    userId: row.userId,
    entityType: row.entityType as AttachableEntityType,
    entityId: row.entityId,
    body: row.body,
    updatedAt: row.updatedAt,
  };
}

export class EntityNoteRepository implements EntityNoteRepositoryPort {
  async find(
    userId: string,
    entityType: AttachableEntityType,
    entityId: string,
  ): Promise<EntityNoteEntity | null> {
    const rows = await getDb()
      .select()
      .from(entityNotes)
      .where(
        and(
          eq(entityNotes.userId, userId),
          eq(entityNotes.entityType, entityType),
          eq(entityNotes.entityId, entityId),
        ),
      )
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async upsert(note: EntityNoteEntity): Promise<void> {
    await getDb()
      .insert(entityNotes)
      .values({
        id: note.id,
        userId: note.userId,
        entityType: note.entityType,
        entityId: note.entityId,
        body: note.body,
        updatedAt: note.updatedAt,
      })
      .onConflictDoUpdate({
        target: [entityNotes.userId, entityNotes.entityType, entityNotes.entityId],
        set: { body: note.body, updatedAt: note.updatedAt },
      });
  }

  async deleteForEntity(
    userId: string,
    entityType: AttachableEntityType,
    entityId: string,
  ): Promise<void> {
    await getDb()
      .delete(entityNotes)
      .where(
        and(
          eq(entityNotes.userId, userId),
          eq(entityNotes.entityType, entityType),
          eq(entityNotes.entityId, entityId),
        ),
      );
  }

  async existingEntityIds(
    userId: string,
    entityType: AttachableEntityType,
    entityIds: string[],
  ): Promise<Set<string>> {
    if (entityIds.length === 0) return new Set();
    const rows = await getDb()
      .selectDistinct({ entityId: entityNotes.entityId })
      .from(entityNotes)
      .where(
        and(
          eq(entityNotes.userId, userId),
          eq(entityNotes.entityType, entityType),
          inArray(entityNotes.entityId, entityIds),
        ),
      );
    return new Set(rows.map((r) => r.entityId));
  }
}
