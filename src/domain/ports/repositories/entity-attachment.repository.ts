import type { EntityAttachmentEntity } from "@/domain/entities/entity-attachment.entity";
import type { AttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export interface EntityAttachmentRepository {
  add(attachment: EntityAttachmentEntity): Promise<void>;
  findById(id: string, userId: string): Promise<EntityAttachmentEntity | null>;
  listForEntity(
    userId: string,
    entityType: AttachableEntityType,
    entityId: string,
  ): Promise<EntityAttachmentEntity[]>;
  remove(id: string, userId: string): Promise<void>;
  totalBytesForUser(userId: string): Promise<number>;
  listAllForUser(userId: string): Promise<EntityAttachmentEntity[]>;
}
