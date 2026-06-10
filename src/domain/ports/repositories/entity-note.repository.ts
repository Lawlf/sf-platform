import type { EntityNoteEntity } from "@/domain/entities/entity-note.entity";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export interface EntityNoteRepositoryPort {
  find(
    userId: string,
    entityType: AttachableEntityType,
    entityId: string,
  ): Promise<EntityNoteEntity | null>;
  upsert(note: EntityNoteEntity): Promise<void>;
  deleteForEntity(
    userId: string,
    entityType: AttachableEntityType,
    entityId: string,
  ): Promise<void>;
}
