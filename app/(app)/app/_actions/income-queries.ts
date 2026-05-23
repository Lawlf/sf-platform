"use server";

import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import type { IncomeFrequency } from "@/domain/entities/income.entity";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface IncomeListItemPayload {
  id: string;
  label: string;
  amount: SerializedMoney;
  frequency: IncomeFrequency;
  isActive: boolean;
}

export async function fetchIncomes(): Promise<IncomeListItemPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const r = await listIncomes({ incomes: new DrizzleIncomeRepository() }, { userId: user.id });
  const list = isOk(r) ? r.value : [];
  return list.map((i) => ({
    id: i.id,
    label: i.label,
    amount: serializeMoney(i.amount),
    frequency: i.frequency,
    isActive: i.isActive,
  }));
}
