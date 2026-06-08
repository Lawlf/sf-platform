"use server";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getEntityNote } from "@/application/use-cases/notes/get-entity-note.use-case";
import { saveEntityNote } from "@/application/use-cases/notes/save-entity-note.use-case";
import { DrizzleEntityNoteRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-entity-note.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  body: z.string().max(5000),
});

export async function saveEntityNoteAction(input: {
  entityType: string;
  entityId: string;
  body: string;
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const result = await saveEntityNote(
    {
      notes: new DrizzleEntityNoteRepository(),
      clock: { now: () => new Date() },
      newId: () => randomUUID(),
    },
    { userId: user.id, ...parsed.data },
  );
  return { ok: result.ok };
}

export async function getEntityNoteAction(input: {
  entityType: string;
  entityId: string;
}): Promise<{ body: string }> {
  const user = await requireUser();
  const note = await getEntityNote(
    { notes: new DrizzleEntityNoteRepository() },
    { userId: user.id, entityType: input.entityType, entityId: input.entityId },
  );
  return { body: note?.body ?? "" };
}
