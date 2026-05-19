"use server";

import { revalidatePath } from "next/cache";

import { archiveDebt } from "@/application/use-cases/debt/archive-debt.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

export async function archiveDebtAction(
  debtId: string,
  reason: "paid_off" | "written_off",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
  const r = await archiveDebt(
    { debts: new DrizzleDebtRepository() },
    { userId: user.id, debtId, reason },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  revalidatePath(`/app/dividas/${debtId}`);
  revalidatePath("/app/dividas");
  return { ok: true };
}
