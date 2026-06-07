"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setWalletAnchor } from "@/application/use-cases/wallet/set-wallet-anchor.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const inputSchema = z.object({
  valueCents: z.string().regex(/^\d+$/, "Valor inválido."),
});

export type SetWalletAnchorResult = { ok: true } | { ok: false; message: string };

export async function setWalletAnchorAction(formInput: unknown): Promise<SetWalletAnchorResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const user = await requireUser();
  const r = await setWalletAnchor(
    { assets: new DrizzleAssetRepository(), clock: new SystemClock() },
    { userId: user.id, valueCents: BigInt(parsed.data.valueCents) },
  );
  if (!isOk(r)) return { ok: false, message: r.error.message };

  revalidatePath("/app/patrimonio");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app");
  return { ok: true };
}
