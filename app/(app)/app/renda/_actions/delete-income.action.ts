"use server";

import { revalidatePath } from "next/cache";

import { deleteIncome } from "@/application/use-cases/income/delete-income.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { detectNotificationsForUser } from "../../_actions/_notifications";

export async function deleteIncomeAction(
  incomeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const r = await deleteIncome(
    {
      incomes: new DrizzleIncomeRepository(),
      clock: new SystemClock(),
    },
    { userId: user.id, incomeId },
  );
  if (isErr(r)) return { ok: false, message: r.error.message };

  // Saldo do mes muda quando uma renda some: dispara redeteccao de
  // notificacoes (negative-balance) com o cenario atualizado.
  await detectNotificationsForUser(user.id);

  // A renda some: invalidamos paginas que listam rendas, dashboard, timeline,
  // notificacoes.
  revalidatePath("/app/renda");
  revalidatePath(`/app/renda/${incomeId}`);
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true };
}
