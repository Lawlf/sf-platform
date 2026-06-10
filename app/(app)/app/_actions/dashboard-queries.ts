"use server";

import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface DashboardSnapshotPayload {
  incomeCommittedPct: number;
  monthlyFreeCashFlow: SerializedMoney;
  totalIncome: SerializedMoney;
  totalDebtBalance: SerializedMoney;
  totalMonthlyDebtService: SerializedMoney;
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshotPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const result = await getDashboardSnapshot(
    {
      debts: repos.debts,
      incomes: repos.incomes,
      clock,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
    },
    { userId: user.id },
  );
  if (!isOk(result)) return null;
  const s = result.value;
  return {
    incomeCommittedPct: s.incomeCommittedPct,
    monthlyFreeCashFlow: serializeMoney(s.monthlyFreeCashFlow),
    totalIncome: serializeMoney(s.totalIncome),
    totalDebtBalance: serializeMoney(s.totalDebtBalance),
    totalMonthlyDebtService: serializeMoney(s.totalMonthlyService),
  };
}
