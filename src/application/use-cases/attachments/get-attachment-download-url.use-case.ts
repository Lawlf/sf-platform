import type { FileStoragePort } from "@/domain/ports/file-storage.port";
import type { EntityAttachmentRepositoryPort } from "@/domain/ports/repositories/entity-attachment.repository";

export async function getAttachmentDownloadUrl(
  deps: {
    attachments: Pick<EntityAttachmentRepositoryPort, "findById">;
    storage: Pick<FileStoragePort, "presignDownload">;
  },
  input: { userId: string; attachmentId: string },
): Promise<string | null> {
  const found = await deps.attachments.findById(input.attachmentId, input.userId);
  if (!found) return null;
  return deps.storage.presignDownload(found.storageKey, found.fileName);
}
