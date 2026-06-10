import type { FileStoragePort } from "@/domain/ports/file-storage.port";
import type { EntityAttachmentRepositoryPort } from "@/domain/ports/repositories/entity-attachment.repository";

export interface DeleteAttachmentDeps {
  attachments: Pick<EntityAttachmentRepositoryPort, "findById" | "remove">;
  storage: Pick<FileStoragePort, "delete">;
}

export type DeleteAttachmentResult = { ok: true } | { ok: false; message: string };

export async function deleteAttachment(
  deps: DeleteAttachmentDeps,
  input: { userId: string; attachmentId: string },
): Promise<DeleteAttachmentResult> {
  const found = await deps.attachments.findById(input.attachmentId, input.userId);
  if (!found) return { ok: false, message: "Arquivo nao encontrado." };
  await deps.storage.delete(found.storageKey);
  await deps.attachments.remove(found.id, input.userId);
  return { ok: true };
}
