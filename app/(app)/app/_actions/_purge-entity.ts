import { purgeEntityAttachments } from "@/application/use-cases/attachments/purge-entity-attachments.use-case";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";
import { DrizzleEntityAttachmentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-entity-attachment.repository";
import { DrizzleEntityNoteRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-entity-note.repository";
import { R2FileStorage } from "@/infrastructure/storage/r2-file-storage";

export async function purgeEntityBestEffort(
  userId: string,
  entityType: AttachableEntityType,
  entityId: string,
): Promise<void> {
  try {
    await purgeEntityAttachments(
      {
        notes: new DrizzleEntityNoteRepository(),
        attachments: new DrizzleEntityAttachmentRepository(),
        storage: new R2FileStorage(),
      },
      { userId, entityType, entityId },
    );
  } catch {
    // Limpeza de notas/anexos nunca pode derrubar o delete da entidade.
  }
}
