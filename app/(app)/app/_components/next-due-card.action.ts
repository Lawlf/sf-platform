"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

const schema = z.object({
  debtId: z.string().uuid(),
  dueIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida"),
});

export async function dismissNextDueAction(debtId: string, dueIso: string): Promise<void> {
  await requireUser();
  const parsed = schema.safeParse({ debtId, dueIso });
  if (!parsed.success) return;
  const store = await cookies();
  const key = `sf_due_dismissed_${parsed.data.debtId}_${parsed.data.dueIso}`;
  store.set(key, "1", {
    maxAge: 60 * 60 * 24 * 14,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/app");
}
