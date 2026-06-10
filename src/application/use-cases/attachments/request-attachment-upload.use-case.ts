import type { FileStoragePort } from "@/domain/ports/file-storage.port";
import type { EntityAttachmentRepositoryPort } from "@/domain/ports/repositories/entity-attachment.repository";
import { isAttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

import { type UploadRejectReason, validateUpload } from "./attachment-limits";
import { buildStorageKey } from "./attachment-storage-key";

export interface RequestUploadDeps {
  attachments: Pick<EntityAttachmentRepositoryPort, "totalBytesForUser">;
  storage: Pick<FileStoragePort, "presignUpload">;
  newId: () => string;
  isPro: boolean;
}

export type RequestUploadResult =
  | { ok: true; attachmentId: string; storageKey: string; uploadUrl: string }
  | { ok: false; reason: UploadRejectReason | "not_pro" | "invalid" };

export async function requestAttachmentUpload(
  deps: RequestUploadDeps,
  input: {
    userId: string;
    entityType: string;
    entityId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  },
): Promise<RequestUploadResult> {
  if (!deps.isPro) return { ok: false, reason: "not_pro" };
  if (!isAttachableEntityType(input.entityType)) return { ok: false, reason: "invalid" };

  const currentTotalBytes = await deps.attachments.totalBytesForUser(input.userId);
  const check = validateUpload({
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    currentTotalBytes,
  });
  if (!check.ok) return { ok: false, reason: check.reason };

  const attachmentId = deps.newId();
  const storageKey = buildStorageKey(input.userId, attachmentId, input.fileName);
  const uploadUrl = await deps.storage.presignUpload(storageKey, input.contentType, input.sizeBytes);
  return { ok: true, attachmentId, storageKey, uploadUrl };
}
