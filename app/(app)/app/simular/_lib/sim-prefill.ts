import "server-only";

import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { isOk } from "@/shared/errors/result";

/**
 * Valores reais do usuário usados para pré-preencher os simuladores (o moat:
 * o usuário não digita do zero). Tudo em centavos, serializado como string
 * para cruzar a fronteira server -> client component sem perder bigint.
 */
export interface SimPrefill {
  /** Patrimônio que rende: reservas + investimentos. */
  investedCents: string;
  /** Só reservas em caixa (para reserva de emergência). */
  cashReserveCents: string;
  /** Saldo livre mensal (renda - parcelas), nunca negativo. */
  contributionCents: string;
  /** Renda mensal equivalente. */
  incomeCents: string;
  /** Saídas mensais comprometidas: parcelas + compromissos recorrentes. */
  monthlyServiceCents: string;
}

export async function loadSimPrefill(userId: string): Promise<SimPrefill> {
  const [netWorth, snapshot] = await Promise.all([
    getNetWorth(
      {
        assets: new DrizzleAssetRepository(),
        allocations: new DrizzleAssetDebtAllocationRepository(),
        debts: new DrizzleDebtRepository(),
      },
      { userId },
    ),
    getDashboardSnapshot(
      {
        debts: new DrizzleDebtRepository(),
        incomes: new DrizzleIncomeRepository(),
        clock: new SystemClock(),
      },
      { userId },
    ),
  ]);

  let investedCents = 0n;
  let cashReserveCents = 0n;
  if (isOk(netWorth)) {
    for (const cat of netWorth.value.byCategory) {
      const cents = cat.netWorth.toCents();
      if (cents <= 0n) continue;
      if (cat.category === "cash") {
        cashReserveCents += cents;
        investedCents += cents;
      } else if (cat.category === "investment") {
        investedCents += cents;
      }
    }
  }

  let contributionCents = 0n;
  let incomeCents = 0n;
  let monthlyServiceCents = 0n;
  if (isOk(snapshot)) {
    const free = snapshot.value.netWorth.toCents();
    contributionCents = free > 0n ? free : 0n;
    incomeCents = snapshot.value.totalIncome.toCents();
    monthlyServiceCents = snapshot.value.totalMonthlyService.toCents();
  }

  return {
    investedCents: investedCents.toString(),
    cashReserveCents: cashReserveCents.toString(),
    contributionCents: contributionCents.toString(),
    incomeCents: incomeCents.toString(),
    monthlyServiceCents: monthlyServiceCents.toString(),
  };
}
