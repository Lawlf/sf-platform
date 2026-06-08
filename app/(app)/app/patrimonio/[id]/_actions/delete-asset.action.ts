"use server";

import { revalidatePath } from "next/cache";

import { deleteAsset } from "@/application/use-cases/asset/delete-asset.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { detectNotificationsForUser } from "../../../_actions/_notifications";
import { purgeEntityBestEffort } from "../../../_actions/_purge-entity";

export async function deleteAssetAction(
  assetId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const r = await deleteAsset(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, assetId },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };

  await purgeEntityBestEffort(user.id, "account", assetId);

  // O ativo some e suas alocacoes saem das dividas vinculadas: o cenario
  // muda, entao redetectamos notificacoes (negative-balance).
  await detectNotificationsForUser(user.id);

  // O ativo some: invalidamos paginas que mostram patrimonio, dividas
  // (algumas perderam alocacoes), dashboard, timeline, notificacoes.
  revalidatePath(`/app/patrimonio/${assetId}`);
  revalidatePath("/app/patrimonio");
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true };
}
