"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordPayment } from "@/application/use-cases/debt/record-payment.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

const schema = z.object({
  debtId: z.string().uuid(),
  paidAt: z.coerce.date(),
  amountCents: z.coerce.bigint().positive(),
  principalCents: z.coerce.bigint().nonnegative(),
  interestCents: z.coerce.bigint().nonnegative(),
  isExtra: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function recordPaymentAction(
  formData: FormData,
): Promise<{ ok: false; message: string }> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
  }
  const d = parsed.data;
  const r = await recordPayment(
    {
      debts: new DrizzleDebtRepository(),
      payments: new DrizzleDebtPaymentRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      debtId: d.debtId,
      amount: Money.fromCents(d.amountCents),
      principalPortion: Money.fromCents(d.principalCents),
      interestPortion: Money.fromCents(d.interestCents),
      isExtra: d.isExtra,
      paidAt: d.paidAt,
    },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  revalidatePath(`/app/dividas/${d.debtId}`);
  redirect(`/app/dividas/${d.debtId}` as Route);
}
