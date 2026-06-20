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
import type { DebtAmountAdjustmentRepositoryPort } from "@/domain/ports/repositories/debt-amount-adjustment.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { IncomeSettlementRepositoryPort } from "@/domain/ports/repositories/income-settlement.repository";
import type { RecurringSettlementRepositoryPort } from "@/domain/ports/repositories/recurring-settlement.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import { FinancialHealthService } from "@/domain/services/financial-health.service";
import { IncomeCommittedService } from "@/domain/services/income-committed.service";
import { monthlyIncomeCents } from "@/domain/services/income-monthly";
import { monthlyDebtOutflow, type TimelineSettlement } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isErr, isOk, ok, type Result } from "@/shared/errors/result";

export interface GetDashboardSnapshotDeps {
  debts: DebtRepositoryPort;
  incomes: IncomeRepositoryPort;
  clock: Clock;
  rates: ExchangeRateRepositoryPort;
  overrides: UserFxOverrideRepositoryPort;
  /** Repos opcionais para renda e saida settlement-aware (paridade com home/prescrição). */
  incomeSettlements?: Pick<IncomeSettlementRepositoryPort, "listForProfile">;
  debtPayments?: Pick<DebtPaymentRepositoryPort, "listForProfileInRange">;
  debtAmountAdjustments?: Pick<DebtAmountAdjustmentRepositoryPort, "listForProfile">;
  recurringSettlements?: Pick<RecurringSettlementRepositoryPort, "listForProfile">;
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
  input: { userId: string; profileId: string },
): Promise<
  Result<DashboardSnapshotResult, InvalidAmortizationParamsError | FxRateUnavailableError>
> {
  const [allDebts, incomes] = await Promise.all([
    deps.debts.listForProfile(input.profileId, { status: "all" }),
    deps.incomes.listForProfile(input.profileId, { onlyActive: true }),
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

  const baseSnapshot = r.value;

  if (
    deps.incomeSettlements &&
    deps.debtPayments &&
    deps.debtAmountAdjustments &&
    deps.recurringSettlements
  ) {
    const month = MonthYear.fromDate(now);
    const activeDebts = convertedDebts.filter((d) => d.status === "active");

    const [incomeSettlements, paymentsThisMonth, adjustments, recurringSettlementsRaw] =
      await Promise.all([
        deps.incomeSettlements.listForProfile(input.profileId),
        deps.debtPayments.listForProfileInRange(input.profileId, {
          from: month.firstDay(),
          to: month.lastDay(),
        }),
        deps.debtAmountAdjustments.listForProfile(input.profileId),
        deps.recurringSettlements.listForProfile(input.profileId),
      ]);

    const settlements: TimelineSettlement[] = recurringSettlementsRaw.map((s) => ({
      debtId: s.debtId,
      monthIso: MonthYear.fromDate(s.month).toIso(),
      status: s.status,
    }));

    const target = { year: now.getUTCFullYear(), month: now.getUTCMonth() };
    const totalIncomeCents = convertedIncomes
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + monthlyIncomeCents(i, target, incomeSettlements), 0n);

    const outflowItems = monthlyDebtOutflow({
      debts: activeDebts,
      paymentsThisMonth,
      month,
      currentMonth: month,
      adjustments,
      settlements,
    });
    const totalOutflowCents = outflowItems.reduce((sum, it) => sum + it.amount.toCents(), 0n);

    return ok({
      ...baseSnapshot,
      totalIncome: Money.fromCents(totalIncomeCents),
      totalMonthlyService: Money.fromCents(totalOutflowCents),
      monthlyFreeCashFlow: Money.fromCents(totalIncomeCents - totalOutflowCents),
      incomeCommittedPct: IncomeCommittedService.compute({
        totalMonthlyIncome: Money.fromCents(totalIncomeCents),
        totalMonthlyDebtService: Money.fromCents(totalOutflowCents),
      }),
    });
  }

  return ok(baseSnapshot);
}
