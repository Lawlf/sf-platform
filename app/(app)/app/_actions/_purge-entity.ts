import { purgeEntityAttachments } from "@/application/use-cases/attachments/purge-entity-attachments.use-case";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";
import { repos } from "@/infrastructure/container";
import { R2FileStorage } from "@/infrastructure/storage/r2-file-storage";

export async function purgeEntityBestEffort(
  userId: string,
  entityType: AttachableEntityType,
  entityId: string,
): Promise<void> {
  try {
    await purgeEntityAttachments(
      {
        notes: repos.entityNotes,
        attachments: repos.entityAttachments,
        storage: new R2FileStorage(),
      },
      { userId, entityType, entityId },
    );
  } catch {
    // Limpeza de notas/anexos nunca pode derrubar o delete da entidade.
  }
}
