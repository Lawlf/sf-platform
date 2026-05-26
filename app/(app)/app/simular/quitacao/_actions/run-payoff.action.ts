"use server";

import { z } from "zod";

import { projectDebtPayoff } from "@/application/use-cases/simulation/project-debt-payoff.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

const schema = z.object({
  debtId: z.string().uuid(),
  monthlyPaymentCents: z.coerce.bigint().positive(),
  extraPaymentCents: z.coerce.bigint().nonnegative().optional(),
});

export type PayoffActionResult =
  | {
      ok: true;
      payoffMonth: number | null;
      payoffDate: string | null;
      totalPaid: string;
      totalInterest: string;
      negativeAmortization: boolean;
    }
  | { ok: false; message: string };

export async function runPayoffAction(formData: FormData): Promise<PayoffActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };

  const r = await projectDebtPayoff(
    { debts: new DrizzleDebtRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      debtId: parsed.data.debtId,
      monthlyPayment: Money.fromCents(parsed.data.monthlyPaymentCents),
      ...(parsed.data.extraPaymentCents !== undefined
        ? { extraPayment: Money.fromCents(parsed.data.extraPaymentCents) }
        : {}),
    },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };
  return {
    ok: true,
    payoffMonth: r.value.payoffMonth,
    payoffDate: r.value.payoffDate?.toISOString() ?? null,
    totalPaid: r.value.totalPaid.format(),
    totalInterest: r.value.totalInterest.format(),
    negativeAmortization: r.value.negativeAmortization,
  };
}
