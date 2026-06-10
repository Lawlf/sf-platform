import type { Clock } from "@/domain/ports/clock.port";
import type { EntityNoteRepositoryPort } from "@/domain/ports/repositories/entity-note.repository";
import { isAttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export interface SaveEntityNoteDeps {
  notes: EntityNoteRepositoryPort;
  clock: Clock;
  newId: () => string;
}

export type SaveEntityNoteResult = { ok: true } | { ok: false; message: string };

const MAX_BODY = 5000;

export async function saveEntityNote(
  deps: SaveEntityNoteDeps,
  input: { userId: string; entityType: string; entityId: string; body: string },
): Promise<SaveEntityNoteResult> {
  if (!isAttachableEntityType(input.entityType)) {
    return { ok: false, message: "Tipo de entidade inválido." };
  }
  const body = input.body.trim().slice(0, MAX_BODY);
  if (body.length === 0) {
    await deps.notes.deleteForEntity(input.userId, input.entityType, input.entityId);
    return { ok: true };
  }
  await deps.notes.upsert({
    id: deps.newId(),
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    body,
    updatedAt: deps.clock.now(),
  });
  return { ok: true };
}
