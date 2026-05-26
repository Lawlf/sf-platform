"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordPayment } from "@/application/use-cases/debt/record-payment.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { UpstashDistributedLock } from "@/infrastructure/cache/upstash-distributed-lock";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { detectNotificationsForUser } from "../../../../_actions/_notifications";

const schema = z.object({
  debtId: z.string().uuid(),
  paidAt: z.coerce.date().refine(
    (d) => {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      return d.getTime() <= endOfToday.getTime();
    },
    { message: "Data do pagamento não pode ser no futuro." },
  ),
  amountCents: z.coerce.bigint().positive(),
  principalCents: z.coerce.bigint().nonnegative(),
  interestCents: z.coerce.bigint().nonnegative(),
  isExtra: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function recordPaymentAction(
  formData: FormData,
): Promise<{ ok: true; debtId: string } | { ok: false; message: string }> {
  const user = await requireUser();
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
      lock: new UpstashDistributedLock(),
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
  await detectNotificationsForUser(user.id);
  revalidatePath(`/app/dividas/${d.debtId}`);
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true, debtId: d.debtId };
}
