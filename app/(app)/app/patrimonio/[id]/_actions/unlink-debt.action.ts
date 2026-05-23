"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { unlinkAssetFromDebt } from "@/application/use-cases/asset/unlink-asset-from-debt.use-case";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  debtId: z.string().uuid(),
});

export type UnlinkDebtResult = { ok: true } | { ok: false; message: string };

export async function unlinkDebtAction(formInput: unknown): Promise<UnlinkDebtResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  const r = await unlinkAssetFromDebt(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
    },
    {
      userId: user.id,
      assetId: parsed.data.assetId,
      debtId: parsed.data.debtId,
    },
  );

  if (!isOk(r)) return { ok: false, message: r.error.message };
  revalidatePath(`/app/patrimonio/${parsed.data.assetId}`);
  revalidatePath("/app/patrimonio");
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}
