import type { EntityNoteEntity } from "@/domain/entities/entity-note.entity";
import type { EntityNoteRepository } from "@/domain/ports/repositories/entity-note.repository";
import { isAttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export async function getEntityNote(
  deps: { notes: EntityNoteRepository },
  input: { userId: string; entityType: string; entityId: string },
): Promise<EntityNoteEntity | null> {
  if (!isAttachableEntityType(input.entityType)) return null;
  return deps.notes.find(input.userId, input.entityType, input.entityId);
}
