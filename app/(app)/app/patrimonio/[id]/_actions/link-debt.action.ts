"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { linkAssetToDebt } from "@/application/use-cases/asset/link-asset-to-debt.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  debtId: z.string().uuid(),
  allocationOriginalCents: z.string().regex(/^\d+$/, "Alocação inválida."),
});

export type LinkDebtResult = { ok: true } | { ok: false; message: string };

export async function linkDebtAction(formInput: unknown): Promise<LinkDebtResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  const r = await linkAssetToDebt(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      assetId: parsed.data.assetId,
      debtId: parsed.data.debtId,
      allocationOriginalCents: BigInt(parsed.data.allocationOriginalCents),
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
