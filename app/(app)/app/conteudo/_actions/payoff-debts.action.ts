"use server";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

export interface PayoffDebt {
  id: string;
  label: string;
  currentBalanceFormatted: string;
}

/** Dívidas ativas pro simulador de quitação dentro do drawer da trilha.
 *  Espelha o carregamento da página /app/simular/quitacao. */
export async function fetchPayoffDebts(): Promise<PayoffDebt[]> {
  const user = await requireUser();
  const listed = await listDebts(
    { debts: new DrizzleDebtRepository() },
    { userId: user.id, status: "active" },
  );
  if (!isOk(listed)) return [];
  return listed.value.map((d) => ({
    id: d.id,
    label: d.label,
    currentBalanceFormatted: d.currentBalance.format(),
  }));
}
