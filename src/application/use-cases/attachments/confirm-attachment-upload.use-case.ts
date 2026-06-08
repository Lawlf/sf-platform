import type { Clock } from "@/domain/ports/clock.port";
import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";
import { isAttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

import { validateUpload } from "./attachment-limits";
import { buildStorageKey } from "./attachment-storage-key";

export interface ConfirmUploadDeps {
  attachments: Pick<EntityAttachmentRepository, "add" | "totalBytesForUser">;
  clock: Clock;
  isPro: boolean;
}

export type ConfirmUploadResult = { ok: true } | { ok: false; message: string };

export async function confirmAttachmentUpload(
  deps: ConfirmUploadDeps,
  input: {
    userId: string;
    attachmentId: string;
    entityType: string;
    entityId: string;
    storageKey: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  },
): Promise<ConfirmUploadResult> {
  if (!deps.isPro) return { ok: false, message: "Recurso disponivel no Pro." };
  if (!isAttachableEntityType(input.entityType)) {
    return { ok: false, message: "Tipo de entidade invalido." };
  }
  if (input.storageKey !== buildStorageKey(input.userId, input.attachmentId, input.fileName)) {
    return { ok: false, message: "Chave de arquivo inválida." };
  }
  const currentTotalBytes = await deps.attachments.totalBytesForUser(input.userId);
  const check = validateUpload({
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    currentTotalBytes,
  });
  if (!check.ok) return { ok: false, message: "Arquivo fora dos limites." };

  await deps.attachments.add({
    id: input.attachmentId,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    storageKey: input.storageKey,
    fileName: input.fileName.slice(0, 255),
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    createdAt: deps.clock.now(),
  });
  return { ok: true };
}
