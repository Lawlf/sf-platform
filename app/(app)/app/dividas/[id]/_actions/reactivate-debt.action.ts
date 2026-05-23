"use server";

import { revalidatePath } from "next/cache";

import { reactivateDebt } from "@/application/use-cases/debt/reactivate-debt.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors";

import { detectNotificationsForUser } from "../../../_actions/_notifications";

export async function reactivateDebtAction(
  debtId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const r = await reactivateDebt(
    {
      debts: new DrizzleDebtRepository(),
      payments: new DrizzleDebtPaymentRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, debtId },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  await detectNotificationsForUser(user.id);
  revalidatePath(`/app/dividas/${debtId}`);
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true };
}
