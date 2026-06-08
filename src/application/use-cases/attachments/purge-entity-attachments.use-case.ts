import type { FileStoragePort } from "@/domain/ports/file-storage.port";
import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";
import type { EntityNoteRepository } from "@/domain/ports/repositories/entity-note.repository";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export interface PurgeEntityDeps {
  notes: Pick<EntityNoteRepository, "deleteForEntity">;
  attachments: Pick<EntityAttachmentRepository, "listForEntity" | "remove">;
  storage: Pick<FileStoragePort, "delete">;
}

export async function purgeEntityAttachments(
  deps: PurgeEntityDeps,
  input: { userId: string; entityType: AttachableEntityType; entityId: string },
): Promise<void> {
  await deps.notes.deleteForEntity(input.userId, input.entityType, input.entityId);
  const list = await deps.attachments.listForEntity(
    input.userId,
    input.entityType,
    input.entityId,
  );
  for (const a of list) {
    await deps.storage.delete(a.storageKey).catch(() => {});
    await deps.attachments.remove(a.id, input.userId);
  }
}
