"use server";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { confirmAttachmentUpload } from "@/application/use-cases/attachments/confirm-attachment-upload.use-case";
import { deleteAttachment } from "@/application/use-cases/attachments/delete-attachment.use-case";
import { getAttachmentDownloadUrl } from "@/application/use-cases/attachments/get-attachment-download-url.use-case";
import { listAttachments } from "@/application/use-cases/attachments/list-attachments.use-case";
import { requestAttachmentUpload } from "@/application/use-cases/attachments/request-attachment-upload.use-case";
import { DrizzleEntityAttachmentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-entity-attachment.repository";
import { R2FileStorage } from "@/infrastructure/storage/r2-file-storage";
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
  const attachments = new DrizzleEntityAttachmentRepository();
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
      attachments: new DrizzleEntityAttachmentRepository(),
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

export async function confirmAttachmentUploadAction(
  input: z.infer<typeof confirmSchema>,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const result = await confirmAttachmentUpload(
    {
      attachments: new DrizzleEntityAttachmentRepository(),
      clock: { now: () => new Date() },
      isPro: user.isPro,
    },
    { userId: user.id, ...parsed.data },
  );
  return { ok: result.ok };
}

export async function deleteAttachmentAction(input: {
  attachmentId: string;
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(input.attachmentId).success) return { ok: false };
  const result = await deleteAttachment(
    { attachments: new DrizzleEntityAttachmentRepository(), storage: new R2FileStorage() },
    { userId: user.id, attachmentId: input.attachmentId },
  );
  return { ok: result.ok };
}

export async function getAttachmentDownloadUrlAction(input: {
  attachmentId: string;
}): Promise<{ url: string | null }> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(input.attachmentId).success) return { url: null };
  const url = await getAttachmentDownloadUrl(
    { attachments: new DrizzleEntityAttachmentRepository(), storage: new R2FileStorage() },
    { userId: user.id, attachmentId: input.attachmentId },
  );
  return { url };
}
