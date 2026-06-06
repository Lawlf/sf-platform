"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateIncome } from "@/application/use-cases/income/update-income.use-case";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { incomeFormSchema } from "@/presentation/http/validators/income.validators";
import { isErr, isOk } from "@/shared/errors/result";

const updateSchema = incomeFormSchema.extend({
  incomeId: z.string().uuid("ID inválido."),
});

export async function updateIncomeAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const amount = Money.fromCents(BigInt(data.amountCents), data.currency);

  const r = await updateIncome(
    { incomes: new DrizzleIncomeRepository(), clock: new SystemClock() },
    {
      userId: user.id,
      incomeId: data.incomeId,
      label: data.label,
      amount,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  );
  if (!isOk(r)) {
    if (isErr(r)) return { ok: false, message: r.error.message };
    return { ok: false, message: "Erro ao salvar renda." };
  }

  revalidatePath("/app/renda");
  revalidatePath("/app");
  return { ok: true };
}
