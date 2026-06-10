import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
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

export interface LoadSimPrefillDeps {
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  debts: DebtRepositoryPort;
  incomes: IncomeRepositoryPort;
  clock: Clock;
  rates: ExchangeRateRepositoryPort;
  overrides: UserFxOverrideRepositoryPort;
}

export async function loadSimPrefill(
  deps: LoadSimPrefillDeps,
  input: { userId: string },
): Promise<SimPrefill> {
  const { userId } = input;
  const [netWorth, snapshot] = await Promise.all([
    getNetWorth(
      {
        assets: deps.assets,
        allocations: deps.allocations,
        debts: deps.debts,
        rates: deps.rates,
        overrides: deps.overrides,
        clock: deps.clock,
      },
      { userId },
    ),
    getDashboardSnapshot(
      {
        debts: deps.debts,
        incomes: deps.incomes,
        clock: deps.clock,
        rates: deps.rates,
        overrides: deps.overrides,
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
    const free = snapshot.value.monthlyFreeCashFlow.toCents();
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
