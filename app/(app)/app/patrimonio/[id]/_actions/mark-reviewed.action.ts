"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { markAssetReviewed } from "@/application/use-cases/asset/mark-asset-reviewed.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const inputSchema = z.object({
  assetId: z.string().uuid(),
});

export type MarkReviewedResult = { ok: true } | { ok: false; message: string };

export async function markReviewedAction(assetId: string): Promise<MarkReviewedResult> {
  const parsed = inputSchema.safeParse({ assetId });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const user = await requireUser();

  const r = await markAssetReviewed(
    { assets: new DrizzleAssetRepository(), clock: new SystemClock() },
    { userId: user.id, assetId: parsed.data.assetId },
  );

  if (!isOk(r)) {
    return { ok: false, message: r.error.message ?? "Erro ao marcar como revisada." };
  }

  revalidatePath("/app");
  revalidatePath("/app/patrimonio");
  revalidatePath(`/app/patrimonio/${parsed.data.assetId}`);
  return { ok: true };
}
