"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { refreshAssetFromFipe } from "@/application/use-cases/asset/refresh-asset-from-fipe.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { ParallelumFipeClient } from "@/infrastructure/external/fipe/parallelum-fipe.client";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const inputSchema = z.object({
  assetId: z.string().uuid(),
});

export type RefreshFipeResult = { ok: true } | { ok: false; message: string };

export async function refreshFipeAction(formInput: unknown): Promise<RefreshFipeResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  const r = await refreshAssetFromFipe(
    {
      assets: new DrizzleAssetRepository(),
      fipe: new ParallelumFipeClient(),
      clock: new SystemClock(),
    },
    { userId: user.id, assetId: parsed.data.assetId },
  );

  if (!isOk(r)) return { ok: false, message: r.error.message };
  revalidatePath(`/app/patrimonio/${parsed.data.assetId}`);
  revalidatePath("/app/patrimonio");
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}
