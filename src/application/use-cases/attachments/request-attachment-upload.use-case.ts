import type { FileStoragePort } from "@/domain/ports/file-storage.port";
import type { EntityAttachmentRepository } from "@/domain/ports/repositories/entity-attachment.repository";
import { isAttachableEntityType } from "@/domain/value-objects/attachable-entity-type";

import { type UploadRejectReason, validateUpload } from "./attachment-limits";

export interface RequestUploadDeps {
  attachments: Pick<EntityAttachmentRepository, "totalBytesForUser">;
  storage: Pick<FileStoragePort, "presignUpload">;
  newId: () => string;
  isPro: boolean;
}

export type RequestUploadResult =
  | { ok: true; attachmentId: string; storageKey: string; uploadUrl: string }
  | { ok: false; reason: UploadRejectReason | "not_pro" | "invalid" };

function extFromName(fileName: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return m ? m[1]!.toLowerCase() : "bin";
}

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
  const storageKey = `${input.userId}/${attachmentId}.${extFromName(input.fileName)}`;
  const uploadUrl = await deps.storage.presignUpload(storageKey, input.contentType);
  return { ok: true, attachmentId, storageKey, uploadUrl };
}
