"use server";

import { revalidatePath } from "next/cache";

import { archiveIncome } from "@/application/use-cases/income/archive-income.use-case";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors";

export async function archiveIncomeAction(
  incomeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();

  const r = await archiveIncome(
    { incomes: new DrizzleIncomeRepository() },
    { userId: user.id, incomeId },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };

  revalidatePath("/app/renda");
  return { ok: true };
}
