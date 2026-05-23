"use server";

import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { getUpcomingDueDates } from "@/application/use-cases/dashboard/get-upcoming-due-dates.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface DashboardSnapshotPayload {
  incomeCommittedPct: number;
  netWorth: SerializedMoney;
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
    },
    { userId: user.id },
  );
  if (!isOk(result)) return null;
  const s = result.value;
  return {
    incomeCommittedPct: s.incomeCommittedPct,
    netWorth: serializeMoney(s.netWorth),
    totalIncome: serializeMoney(s.totalIncome),
    totalDebtBalance: serializeMoney(s.totalDebtBalance),
    totalMonthlyDebtService: serializeMoney(s.totalMonthlyService),
  };
}

export interface UpcomingDuePayload {
  debtId: string;
  label: string;
  dueDateIso: string;
  amount: SerializedMoney | null;
}

export async function fetchUpcomingDues(): Promise<UpcomingDuePayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const r = await getUpcomingDueDates(
    { debts: new DrizzleDebtRepository(), clock: new SystemClock() },
    { userId: user.id, horizonDays: 30 },
  );
  const list = isOk(r) ? r.value : [];
  return list.map((d) => ({
    debtId: d.debtId,
    label: d.label,
    dueDateIso: d.dueDate.toISOString(),
    amount: d.amount ? serializeMoney(d.amount) : null,
  }));
}
