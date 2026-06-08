import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export interface EntityAttachmentEntity {
  id: string;
  userId: string;
  entityType: AttachableEntityType;
  entityId: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}
