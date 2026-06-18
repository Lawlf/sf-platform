import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import {
  BASE_CURRENCY,
  convertDebtToBase,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import {
  monthlyDebtService,
  monthlyRateFor,
} from "@/domain/services/financial-health.service";
import type { GoalMacro, GoalMacroDebt } from "@/domain/services/goal-progress.service";
import { isOk } from "@/shared/errors/result";

export interface BuildGoalMacroDeps {
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  debts: DebtRepositoryPort;
  incomes: IncomeRepositoryPort;
  clock: Clock;
  rates: ExchangeRateRepositoryPort;
  overrides: UserFxOverrideRepositoryPort;
}

export interface BuildGoalMacroInput {
  userId: string;
  profileId: string;
}

/**
 * Monta o `GoalMacro` de um usuario reusando os use-cases existentes de
 * net-worth e dashboard snapshot. Nao instancia repositorios internamente:
 * todos os adaptadores sao recebidos via deps (injecao).
 */
export async function buildGoalMacro(
  deps: BuildGoalMacroDeps,
  input: BuildGoalMacroInput,
): Promise<GoalMacro> {
  const { userId, profileId } = input;

  const [netWorthResult, snapshotResult, activeDebts] = await Promise.all([
    getNetWorth(
      {
        assets: deps.assets,
        allocations: deps.allocations,
        debts: deps.debts,
        rates: deps.rates,
        overrides: deps.overrides,
        clock: deps.clock,
      },
      { userId, profileId },
    ),
    getDashboardSnapshot(
      {
        debts: deps.debts,
        incomes: deps.incomes,
        clock: deps.clock,
        rates: deps.rates,
        overrides: deps.overrides,
      },
      { userId, profileId },
    ),
    deps.debts.listForProfile(profileId, { status: "active" }),
  ]);

  // Patrimonio: caixa + investimentos (somente categorias positivas).
  let investedCents = 0n;
  let cashReserveCents = 0n;
  if (isOk(netWorthResult)) {
    for (const cat of netWorthResult.value.byCategory) {
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

  // Saldo livre mensal, servico total e renda total.
  let contributionCents = 0n;
  let monthlyServiceCents = 0n;
  let monthlyIncomeCents = 0n;
  if (isOk(snapshotResult)) {
    const free = snapshotResult.value.monthlyFreeCashFlow.toCents();
    contributionCents = free > 0n ? free : 0n;
    monthlyServiceCents = snapshotResult.value.totalMonthlyService.toCents();
    monthlyIncomeCents = snapshotResult.value.totalIncome.toCents();
  }

  // Monta GoalMacroDebt para cada divida ativa. Dívidas onde monthlyDebtService
  // retorna erro sao ignoradas (nao comprometem o macro).
  const debts: GoalMacroDebt[] = [];
  for (const rawDebt of activeDebts) {
    const convertedResult = await convertDebtToBase(deps, userId, rawDebt, BASE_CURRENCY);
    if (!isOk(convertedResult)) continue;
    const debt = convertedResult.value;

    const svcResult = monthlyDebtService(debt);
    if (!isOk(svcResult)) continue;

    const monthlyReais = svcResult.value;
    const monthlyPaymentCents = BigInt(Math.round(monthlyReais * 100));

    const monthlyRate = monthlyRateFor(debt);
    const annualRatePct = (Math.pow(1 + monthlyRate, 12) - 1) * 100;

    debts.push({
      id: debt.id,
      originalPrincipalCents: debt.originalPrincipal.toCents(),
      currentBalanceCents: debt.currentBalance.toCents(),
      monthlyPaymentCents,
      annualRatePct,
    });
  }

  return {
    investedCents,
    cashReserveCents,
    contributionCents,
    monthlyServiceCents,
    monthlyIncomeCents,
    debts,
  };
}
