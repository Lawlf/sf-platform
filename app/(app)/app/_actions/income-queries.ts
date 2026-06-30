"use server";

import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import type { IncomeFrequency } from "@/domain/entities/income.entity";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface IncomeListItemPayload {
  id: string;
  label: string;
  amount: SerializedMoney;
  frequency: IncomeFrequency;
  isActive: boolean;
  isEstimated: boolean;
  /**
   * Soma das parcelas de consignados (personal_loan ativos, payrollDeducted,
   * linkedIncomeId === este income) atrelados a essa renda. `0` quando não
   * há consignado vinculado. Opcional/default 0 pra não quebrar consumidores
   * existentes do payload.
   */
  consignadoDeductionCents?: string;
}

export async function fetchIncomes(): Promise<IncomeListItemPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const profileId = await getActiveProfileId();
  const [r, debts] = await Promise.all([
    listIncomes({ incomes: repos.incomes }, { profileId }),
    repos.debts.listForProfile(profileId, { status: "active" }),
  ]);
  const list = isOk(r) ? r.value : [];

  const deductionByIncomeId = new Map<string, bigint>();
  for (const debt of debts) {
    if (debt.kind !== "personal_loan" || !debt.payrollDeducted || !debt.linkedIncomeId) continue;
    const current = deductionByIncomeId.get(debt.linkedIncomeId) ?? 0n;
    deductionByIncomeId.set(debt.linkedIncomeId, current + debt.monthlyInstallment.toCents());
  }

  return list.map((i) => {
    const consignadoDeductionCents = deductionByIncomeId.get(i.id) ?? 0n;
    const payload: IncomeListItemPayload = {
      id: i.id,
      label: i.label,
      amount: serializeMoney(i.amount),
      frequency: i.frequency,
      isActive: i.isActive,
      isEstimated: i.isEstimated,
    };
    if (consignadoDeductionCents > 0n) {
      payload.consignadoDeductionCents = consignadoDeductionCents.toString();
    }
    return payload;
  });
}
