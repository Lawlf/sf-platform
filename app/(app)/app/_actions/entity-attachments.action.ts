"use server";

import { randomUUID } from "node:crypto";


import { z } from "zod";

import { confirmAttachmentUpload } from "@/application/use-cases/attachments/confirm-attachment-upload.use-case";
import { deleteAttachment } from "@/application/use-cases/attachments/delete-attachment.use-case";
import { getAttachmentDownloadUrl } from "@/application/use-cases/attachments/get-attachment-download-url.use-case";
import { listAttachments } from "@/application/use-cases/attachments/list-attachments.use-case";
import { renameAttachment } from "@/application/use-cases/attachments/rename-attachment.use-case";
import { requestAttachmentUpload } from "@/application/use-cases/attachments/request-attachment-upload.use-case";
import { repos } from "@/infrastructure/container";
import { R2FileStorage } from "@/infrastructure/storage/r2-file-storage";
import { action, ActionError } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const entityRef = z.object({ entityType: z.string(), entityId: z.string().uuid() });

export interface AttachmentDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export async function listAttachmentsAction(input: {
  entityType: string;
  entityId: string;
}): Promise<{ items: AttachmentDto[]; totalBytes: number }> {
  const user = await requireUser();
  const parsed = entityRef.safeParse(input);
  if (!parsed.success) return { items: [], totalBytes: 0 };
  const attachments = repos.entityAttachments;
  const [items, totalBytes] = await Promise.all([
    listAttachments({ attachments }, { userId: user.id, ...parsed.data }),
    attachments.totalBytesForUser(user.id),
  ]);
  return {
    items: items.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      contentType: a.contentType,
      sizeBytes: a.sizeBytes,
      createdAt: a.createdAt.toISOString(),
    })),
    totalBytes,
  };
}

const requestSchema = entityRef.extend({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function requestAttachmentUploadAction(
  input: z.infer<typeof requestSchema>,
): Promise<
  | { ok: true; attachmentId: string; storageKey: string; uploadUrl: string }
  | { ok: false; reason: string }
> {
  const user = await requireUser();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const result = await requestAttachmentUpload(
    {
      attachments: repos.entityAttachments,
      storage: new R2FileStorage(),
      newId: () => randomUUID(),
      isPro: user.isPro,
    },
    { userId: user.id, ...parsed.data },
  );
  return result;
}

const confirmSchema = requestSchema.extend({
  attachmentId: z.string().uuid(),
  storageKey: z.string().min(1),
});

export const confirmAttachmentUploadAction = action({
  schema: confirmSchema,
  handler: async (input, { userId }) => {
    const user = await requireUser();
    const result = await confirmAttachmentUpload(
      {
        attachments: repos.entityAttachments,
        clock: { now: () => new Date() },
        isPro: user.isPro,
      },
      { userId, ...input },
    );
    if (!result.ok) throw new ActionError(result.message);
  },
});

export const deleteAttachmentAction = action({
  schema: z.object({ attachmentId: z.string().uuid() }),
  handler: async ({ attachmentId }, { userId }) => {
    const result = await deleteAttachment(
      { attachments: repos.entityAttachments, storage: new R2FileStorage() },
      { userId, attachmentId },
    );
    if (!result.ok) throw new ActionError(result.message);
  },
});

const renameSchema = z.object({
  attachmentId: z.string().uuid(),
  newName: z.string().min(1).max(200),
});

export const renameAttachmentAction = action({
  schema: renameSchema,
  handler: async ({ attachmentId, newName }, { userId }) => {
    const result = await renameAttachment(
      { attachments: repos.entityAttachments },
      { userId, attachmentId, newName },
    );
    if (!result.ok) throw new ActionError(result.message);
    return { fileName: result.fileName };
  },
});

export async function getAttachmentDownloadUrlAction(input: {
  attachmentId: string;
}): Promise<{ url: string | null }> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(input.attachmentId).success) return { url: null };
  const url = await getAttachmentDownloadUrl(
    { attachments: repos.entityAttachments, storage: new R2FileStorage() },
    { userId: user.id, attachmentId: input.attachmentId },
  );
  return { url };
}
