import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export interface EntityNoteEntity {
  id: string;
  userId: string;
  entityType: AttachableEntityType;
  entityId: string;
  body: string;
  updatedAt: Date;
}
