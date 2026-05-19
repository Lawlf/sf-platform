"use server";

import { revalidatePath } from "next/cache";

import { registerIncome } from "@/application/use-cases/income/register-income.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { incomeFormSchema } from "@/presentation/http/validators/income.validators";

export async function createIncomeAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const raw = Object.fromEntries(formData.entries());
  const parsed = incomeFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Entrada invalida." };
  }
  const data = parsed.data;
  const amount = Money.fromCents(BigInt(data.amountCents));

  await registerIncome(
    { incomes: new DrizzleIncomeRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      label: data.label,
      amount,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  );

  revalidatePath("/app/renda");
  return { ok: true };
}
