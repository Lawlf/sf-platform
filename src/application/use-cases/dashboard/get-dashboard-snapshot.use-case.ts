import {
  BASE_CURRENCY,
  convertDebtToBase,
  convertIncomeToBase,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type {
  FxRateUnavailableError,
  InvalidAmortizationParamsError,
} from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import { FinancialHealthService } from "@/domain/services/financial-health.service";
import { err, isErr, isOk, ok, type Result } from "@/shared/errors/result";

export interface GetDashboardSnapshotDeps {
  debts: DebtRepositoryPort;
  incomes: IncomeRepositoryPort;
  clock: Clock;
  rates: ExchangeRateRepositoryPort;
  overrides: UserFxOverrideRepositoryPort;
}

/**
 * Resultado do snapshot do dashboard.
 *
 * Após o merge Expense -> Debt, `totalMonthlyService` cobre TODAS as saídas
 * comprometidas no mês: parcelas de dívida tradicional + compromissos
 * recorrentes (`recurring`). O antigo `totalMonthlyExpenses` foi removido.
 */
export type DashboardSnapshotResult = FinancialSnapshotEntity;

export async function getDashboardSnapshot(
  deps: GetDashboardSnapshotDeps,
  input: { userId: string },
): Promise<
  Result<DashboardSnapshotResult, InvalidAmortizationParamsError | FxRateUnavailableError>
> {
  const [allDebts, incomes] = await Promise.all([
    deps.debts.listForUser(input.userId, { status: "all" }),
    deps.incomes.listForUser(input.userId, { onlyActive: true }),
  ]);
  // Ativas + "fora do mês" (written_off). As quitadas (paid_off) ficam de fora.
  // O snapshot separa por dentro: total inclui written_off, mensal só ativas.
  const debts = allDebts.filter((d) => d.status === "active" || d.status === "written_off");
  const now = deps.clock.now();

  const convertedIncomes: IncomeEntity[] = [];
  for (const income of incomes) {
    const r = await convertIncomeToBase(deps, input.userId, income, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedIncomes.push(r.value);
  }

  const convertedDebts: DebtEntity[] = [];
  for (const debt of debts) {
    const r = await convertDebtToBase(deps, input.userId, debt, BASE_CURRENCY);
    if (isErr(r)) return r;
    convertedDebts.push(r.value);
  }

  const r = FinancialHealthService.snapshot({
    userId: input.userId,
    incomes: convertedIncomes,
    debts: convertedDebts,
    asOfDate: now,
  });
  if (!isOk(r)) return err(r.error);
  return ok(r.value);
}
