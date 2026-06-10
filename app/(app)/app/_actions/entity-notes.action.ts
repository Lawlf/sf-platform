"use server";

import { randomUUID } from "node:crypto";


import { z } from "zod";

import { getEntityNote } from "@/application/use-cases/notes/get-entity-note.use-case";
import { saveEntityNote } from "@/application/use-cases/notes/save-entity-note.use-case";
import { repos } from "@/infrastructure/container";
import { action, ActionError } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  body: z.string().max(5000),
});

export const saveEntityNoteAction = action({
  schema,
  handler: async (input, { userId }) => {
    const result = await saveEntityNote(
      {
        notes: repos.entityNotes,
        clock: { now: () => new Date() },
        newId: () => randomUUID(),
      },
      { userId, ...input },
    );
    if (!result.ok) throw new ActionError(result.message);
  },
});

export async function getEntityNoteAction(input: {
  entityType: string;
  entityId: string;
}): Promise<{ body: string }> {
  const user = await requireUser();
  const note = await getEntityNote(
    { notes: repos.entityNotes },
    { userId: user.id, entityType: input.entityType, entityId: input.entityId },
  );
  return { body: note?.body ?? "" };
}
