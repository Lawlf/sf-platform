"use server";

import { fetchDebts } from "@/app/(app)/app/_actions/debt-queries";
import { fetchIncomes } from "@/app/(app)/app/_actions/income-queries";
import { updateDebtAction } from "@/app/(app)/app/dividas/[id]/_actions/update-debt.action";
import {
  createDebtAction,
  type CreateDebtResult,
} from "@/app/(app)/app/dividas/_actions/create-debt.action";
import { createIncomeAction } from "@/app/(app)/app/renda/_actions/create-income.action";
import { updateIncomeAction } from "@/app/(app)/app/renda/_actions/update-income.action";

type IncomeResult = { ok: true } | { ok: false; message: string };

// Idempotência do onboarding: o wizard ainda não foi concluído (gate é
// onboardingWizardSeenAt) e cria a renda/dívida a cada step. Se o usuário sai e
// volta, o wizard reinicia e recriaria tudo. Durante o onboarding existe no
// máximo uma renda e um cartão, então reaproveitamos o existente em vez de
// duplicar. Sem id no cliente: a verdade fica no servidor e o upsert é seguro
// em mesma sessão e entre sessões.

export async function upsertOnboardingIncomeAction(formData: FormData): Promise<IncomeResult> {
  const incomes = await fetchIncomes();
  const existing = incomes[0];
  if (existing) {
    formData.set("incomeId", existing.id);
    return updateIncomeAction(formData);
  }
  return createIncomeAction(formData);
}

export async function upsertOnboardingDebtAction(formData: FormData): Promise<CreateDebtResult> {
  const debts = await fetchDebts({ status: "active" });
  const existing = debts.find((d) => d.kind === "credit_card");
  if (existing) {
    formData.set("debtId", existing.id);
    return updateDebtAction(formData);
  }
  formData.set("kind", "credit_card");
  return createDebtAction(formData);
}
