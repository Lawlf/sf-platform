"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { linkAssetToDebt } from "@/application/use-cases/asset/link-asset-to-debt.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const inputSchema = z.object({
  assetId: z.string().uuid(),
  debtId: z.string().uuid(),
  allocationOriginalCents: z.string().regex(/^\d+$/, "Alocação inválida."),
});

export type LinkDebtToAssetInput = z.input<typeof inputSchema>;

export type LinkDebtToAssetResult = { ok: true } | { ok: false; message: string };

// Vincula uma dívida recém-criada a um ativo já existente. Espelha a action
// linkDebtAction localizada em patrimonio/[id]/_actions/, mas pertence ao fluxo
// dos wizards de dívida.
export async function linkDebtToAssetAction(
  raw: LinkDebtToAssetInput,
): Promise<LinkDebtToAssetResult> {
  const parsed = inputSchema.safeParse(raw);
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
  revalidatePath(`/app/dividas/${parsed.data.debtId}`);
  revalidatePath("/app/patrimonio");
  revalidatePath("/app/dividas");
  return { ok: true };
}
