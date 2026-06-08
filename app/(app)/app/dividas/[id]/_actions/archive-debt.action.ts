"use server";

import { revalidatePath } from "next/cache";

import { archiveDebt } from "@/application/use-cases/debt/archive-debt.use-case";
import { UpstashDistributedLock } from "@/infrastructure/cache/upstash-distributed-lock";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { detectNotificationsForUser } from "../../../_actions/_notifications";

export async function archiveDebtAction(
  debtId: string,
  reason: "paid_off" | "written_off",
  note?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const r = await archiveDebt(
    {
      debts: new DrizzleDebtRepository(),
      payments: new DrizzleDebtPaymentRepository(),
      clock: new SystemClock(),
      lock: new UpstashDistributedLock(),
    },
    { userId: user.id, debtId, reason, ...(note !== undefined ? { note } : {}) },
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
