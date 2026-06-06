"use server";

import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleUserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-fx-override.repository";
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
      debts: new DrizzleDebtRepository(),
      incomes: new DrizzleIncomeRepository(),
      clock: new SystemClock(),
      rates: new DrizzleExchangeRateRepository(),
      overrides: new DrizzleUserFxOverrideRepository(),
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
