"use server";

import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export interface CreditCardDebtPayload {
  id: string;
  label: string;
}

// Lista as dívidas ativas do tipo credit_card do usuário corrente. Usado no Step 3
// do wizard "Comprei algo novo" para permitir vincular a compra a um cartão já
// cadastrado em vez de criar um novo.
export async function listCreditCardsForPurchase(): Promise<CreditCardDebtPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const repo = new DrizzleDebtRepository();
  const debts = await repo.listForUser(user.id, { status: "active" });
  return debts.filter((d) => d.kind === "credit_card").map((d) => ({ id: d.id, label: d.label }));
}
