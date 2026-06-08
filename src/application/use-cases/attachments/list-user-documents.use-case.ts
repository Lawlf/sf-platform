import type { EntityAttachmentEntity } from "@/domain/entities/entity-attachment.entity";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export interface UserDocument {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAtIso: string;
  entityType: AttachableEntityType;
  entityId: string;
  parentLabel: string;
}

export function toUserDocuments(
  attachments: EntityAttachmentEntity[],
  labelOf: (entityType: AttachableEntityType, entityId: string) => string | null,
): UserDocument[] {
  return attachments.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    contentType: a.contentType,
    sizeBytes: a.sizeBytes,
    createdAtIso: a.createdAt.toISOString(),
    entityType: a.entityType,
    entityId: a.entityId,
    parentLabel: labelOf(a.entityType, a.entityId) ?? "Sem vínculo",
  }));
}
