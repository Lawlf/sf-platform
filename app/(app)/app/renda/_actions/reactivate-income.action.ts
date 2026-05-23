"use server";

import { revalidatePath } from "next/cache";

import { reactivateIncome } from "@/application/use-cases/income/reactivate-income.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors";

export async function reactivateIncomeAction(
  incomeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();

  const r = await reactivateIncome(
    { incomes: new DrizzleIncomeRepository(), clock: new SystemClock() },
    { userId: user.id, incomeId },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };

  revalidatePath("/app/renda");
  revalidatePath("/app");
  return { ok: true };
}
