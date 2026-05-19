"use server";

import { z } from "zod";

import { simulateExtraPayment } from "@/application/use-cases/simulation/simulate-extra-payment.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

const schema = z.object({
  debtId: z.string().uuid(),
  monthlyPaymentCents: z.coerce.bigint().positive(),
  extraPaymentCents: z.coerce.bigint().positive(),
});

export type ExtraActionResult =
  | {
      ok: true;
      baselinePayoffMonth: number | null;
      withExtraPayoffMonth: number | null;
      monthsSaved: number;
      interestSavedFormatted: string;
      baselineInterestFormatted: string;
      withExtraInterestFormatted: string;
    }
  | { ok: false; message: string };

export async function runExtraAction(formData: FormData): Promise<ExtraActionResult> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };

  const r = await simulateExtraPayment(
    { debts: new DrizzleDebtRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      debtId: parsed.data.debtId,
      monthlyPayment: Money.fromCents(parsed.data.monthlyPaymentCents),
      extraPayment: Money.fromCents(parsed.data.extraPaymentCents),
    },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  return {
    ok: true,
    baselinePayoffMonth: r.value.baseline.payoffMonth,
    withExtraPayoffMonth: r.value.withExtra.payoffMonth,
    monthsSaved: r.value.monthsSaved,
    interestSavedFormatted: r.value.interestSaved.format(),
    baselineInterestFormatted: r.value.baseline.totalInterest.format(),
    withExtraInterestFormatted: r.value.withExtra.totalInterest.format(),
  };
}
