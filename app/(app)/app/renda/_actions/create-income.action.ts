"use server";

import { revalidatePath } from "next/cache";

import { registerIncome } from "@/application/use-cases/income/register-income.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { incomeFormSchema } from "@/presentation/http/validators/income.validators";

export async function createIncomeAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();

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
