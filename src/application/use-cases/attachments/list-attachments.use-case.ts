import type { EntityAttachmentEntity } from "@/domain/entities/entity-attachment.entity";
import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";
import { isAttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

export async function listAttachments(
  deps: { attachments: Pick<EntityAttachmentRepository, "listForEntity"> },
  input: { userId: string; entityType: string; entityId: string },
): Promise<EntityAttachmentEntity[]> {
  if (!isAttachableEntityType(input.entityType)) return [];
  return deps.attachments.listForEntity(input.userId, input.entityType, input.entityId);
}
