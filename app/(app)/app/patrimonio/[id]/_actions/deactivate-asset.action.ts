"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { deactivateAsset } from "@/application/use-cases/asset/deactivate-asset.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  kind: z.enum(["sold", "lost", "donated", "not_specified"]),
  salePriceCents: z
    .string()
    .regex(/^-?\d+$/, "Preço de venda inválido.")
    .nullable()
    .optional(),
  reason: z.string().max(500).nullable().optional(),
});

export type DeactivateAssetResult = { ok: true } | { ok: false; message: string };

export async function deactivateAssetAction(formInput: unknown): Promise<DeactivateAssetResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  let salePriceCents: bigint | null = null;
  if (parsed.data.salePriceCents !== undefined && parsed.data.salePriceCents !== null) {
    try {
      salePriceCents = BigInt(parsed.data.salePriceCents);
    } catch {
      return { ok: false, message: "Preço de venda inválido." };
    }
  }

  const r = await deactivateAsset(
    { assets: new DrizzleAssetRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      assetId: parsed.data.assetId,
      kind: parsed.data.kind,
      salePriceCents,
      reason: parsed.data.reason ?? null,
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
