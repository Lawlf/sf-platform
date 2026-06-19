"use server";

import { z } from "zod";

import { simulateExtraPayment } from "@/application/use-cases/simulation/simulate-extra-payment.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

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
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada inválida." };

  const profileId = await getActiveProfileId();

  const r = await simulateExtraPayment(
    { debts: repos.debts, clock },
    {
      userId: user.id,
      profileId,
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
