"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateAsset } from "@/application/use-cases/asset/update-asset.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  label: z.string().min(1).max(120).optional(),
  currentValueCents: z
    .string()
    .regex(/^-?\d+$/, "Valor inválido.")
    .optional(),
});

export type UpdateAssetResult = { ok: true } | { ok: false; message: string };

export async function updateAssetAction(formInput: unknown): Promise<UpdateAssetResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  const currentValueCents =
    parsed.data.currentValueCents !== undefined ? BigInt(parsed.data.currentValueCents) : undefined;

  const r = await updateAsset(
    { assets: new DrizzleAssetRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      assetId: parsed.data.assetId,
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
      ...(currentValueCents !== undefined ? { currentValueCents } : {}),
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
