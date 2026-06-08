"use server";

import { revalidatePath } from "next/cache";

import { deleteDebt } from "@/application/use-cases/debt/delete-debt.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { detectNotificationsForUser } from "../../../_actions/_notifications";
import { purgeEntityBestEffort } from "../../../_actions/_purge-entity";

export async function deleteDebtAction(
  debtId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const r = await deleteDebt(
    {
      debts: new DrizzleDebtRepository(),
      payments: new DrizzleDebtPaymentRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, debtId },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  await purgeEntityBestEffort(user.id, "debt", debtId);
  await detectNotificationsForUser(user.id);
  // A dívida some: invalidamos páginas que listam dívidas, dashboard, timeline,
  // notificações e patrimônio (ativos podem ter perdido alocações).
  revalidatePath(`/app/dividas/${debtId}`);
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  revalidatePath("/app/patrimonio");
  return { ok: true };
}
