"use server";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { validateUpload } from "@/application/use-cases/attachments/attachment-limits";
import { recordFeedback } from "@/application/use-cases/feedback/record-feedback.use-case";
import { repos } from "@/infrastructure/container";
import { R2FileStorage } from "@/infrastructure/storage/r2-file-storage";
import { action, ActionError } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({
  surface: z.string().min(1).max(64),
  sentiment: z.enum(["up", "down"]).optional(),
  comment: z.string().max(2000).optional(),
  kind: z.enum(["problema", "sugestao", "duvida"]).optional(),
  attachmentKeys: z.array(z.string().max(256)).max(5).optional(),
});

export const submitFeedbackAction = action({
  schema,
  handler: async (input, { userId }) => {
    const result = await recordFeedback(
      { feedback: repos.feedbackEvents, clock: { now: () => new Date() }, newId: () => randomUUID() },
      { userId, ...input },
    );
    if (!result.ok) throw new ActionError(result.message);
  },
});

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

function feedbackStorageKey(userId: string, id: string, fileName: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  const ext = m ? m[1]!.toLowerCase() : "bin";
  return `feedback/${userId}/${id}.${ext}`;
}

export async function requestFeedbackUploadAction(
  input: z.infer<typeof uploadSchema>,
): Promise<
  { ok: true; storageKey: string; uploadUrl: string } | { ok: false; reason: string }
> {
  const user = await requireUser();
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const check = validateUpload({
    contentType: parsed.data.contentType,
    sizeBytes: parsed.data.sizeBytes,
    currentTotalBytes: 0,
  });
  if (!check.ok) return { ok: false, reason: check.reason };

  const storageKey = feedbackStorageKey(user.id, randomUUID(), parsed.data.fileName);
  const uploadUrl = await new R2FileStorage().presignUpload(
    storageKey,
    parsed.data.contentType,
    parsed.data.sizeBytes,
  );
  return { ok: true, storageKey, uploadUrl };
}
