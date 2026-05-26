import crypto from "node:crypto";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

import { PriceAmortizationService } from "./amortization/price-amortization.service";
import { SacAmortizationService } from "./amortization/sac-amortization.service";
import { IncomeCommittedService } from "./income-committed.service";

export interface FinancialSnapshotInput {
  userId: string;
  incomes: IncomeEntity[];
  debts: DebtEntity[];
  asOfDate: Date;
}

const CREDIT_CARD_MIN_PCT = 0.15;
// 52 semanas / 12 meses = 4.333... (mesmo coeficiente do TimelineService).
const WEEKS_PER_MONTH = 4.33;
const SAME_MONTH = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();

export class FinancialHealthService {
  static snapshot(
    input: FinancialSnapshotInput,
  ): Result<FinancialSnapshotEntity, InvalidAmortizationParamsError> {
    const activeIncomes = input.incomes.filter((i) => isIncomeActiveAt(i, input.asOfDate));
    const activeDebts = input.debts.filter((d) => d.status === "active");

    const totalIncomeNumber = activeIncomes.reduce(
      (sum, inc) => sum + monthlyEquivalent(inc, input.asOfDate),
      0,
    );
    const totalIncomeR = Money.from(totalIncomeNumber);
    if (!isOk(totalIncomeR)) {
      return err(new InvalidAmortizationParamsError("Total de renda invalido."));
    }
    const totalIncome = totalIncomeR.value;

    const totalDebtBalanceNumber = activeDebts.reduce(
      (sum, d) => sum + d.currentBalance.toNumber(),
      0,
    );
    const totalDebtBalanceR = Money.from(totalDebtBalanceNumber);
    if (!isOk(totalDebtBalanceR)) {
      return err(new InvalidAmortizationParamsError("Total de divida invalido."));
    }
    const totalDebtBalance = totalDebtBalanceR.value;

    let totalMonthlyServiceNumber = 0;
    let weightedRateNumerator = 0;
    let weightedRateDenominator = 0;
    for (const d of activeDebts) {
      const svc = monthlyDebtService(d);
      if (!isOk(svc)) return err(svc.error);
      totalMonthlyServiceNumber += svc.value;
      const monthlyRate = monthlyRateFor(d);
      const balance = d.currentBalance.toNumber();
      weightedRateNumerator += monthlyRate * balance;
      weightedRateDenominator += balance;
    }

    const totalMonthlyServiceR = Money.from(totalMonthlyServiceNumber);
    if (!isOk(totalMonthlyServiceR)) {
      return err(new InvalidAmortizationParamsError("Servico mensal da divida invalido."));
    }
    const totalMonthlyService = totalMonthlyServiceR.value;

    const incomeCommittedPct = IncomeCommittedService.compute({
      totalMonthlyIncome: totalIncome,
      totalMonthlyDebtService: totalMonthlyService,
    });

    const weightedMonthlyRate =
      weightedRateDenominator > 0 ? weightedRateNumerator / weightedRateDenominator : 0;
    const cetRateR = InterestRate.fromMonthly(weightedMonthlyRate);
    if (!isOk(cetRateR)) {
      return err(new InvalidAmortizationParamsError("CET ponderada invalida."));
    }

    const netWorthNumber = totalIncomeNumber - totalMonthlyServiceNumber;
    const netWorthR = Money.from(netWorthNumber);
    if (!isOk(netWorthR)) {
      return err(new InvalidAmortizationParamsError("Net worth invalido."));
    }

    return ok({
      id: crypto.randomUUID(),
      userId: input.userId,
      asOfDate: input.asOfDate,
      totalIncome,
      totalDebtBalance,
      totalMonthlyService,
      netWorth: netWorthR.value,
      cetWeightedAverage: cetRateR.value.toAnnual(),
      incomeCommittedPct,
    });
  }
}

function isIncomeActiveAt(income: IncomeEntity, asOf: Date): boolean {
  if (!income.isActive) return false;
  if (income.startDate.getTime() > asOf.getTime()) return false;
  if (income.endDate !== null && income.endDate.getTime() < asOf.getTime()) return false;
  return true;
}

function monthlyEquivalent(income: IncomeEntity, asOf: Date): number {
  if (!isIncomeActiveAt(income, asOf)) return 0;
  const amount = income.amount.toNumber();
  switch (income.frequency) {
    case "monthly":
      return amount;
    case "weekly":
      return amount * (52 / 12);
    case "one_off":
      return SAME_MONTH(income.startDate, asOf) ? amount : 0;
  }
}

function monthlyRateFor(debt: DebtEntity): number {
  switch (debt.kind) {
    case "financing":
    case "personal_loan":
      return debt.annualInterestRate.toMonthly().toDecimal();
    case "credit_card":
      return debt.revolvingMonthlyRate?.toDecimal() ?? 0;
    case "overdraft":
      return debt.monthlyRate.toDecimal();
    case "recurring":
      // Compromissos recorrentes não incidem juros sobre saldo.
      return 0;
  }
}

function monthlyDebtService(debt: DebtEntity): Result<number, InvalidAmortizationParamsError> {
  switch (debt.kind) {
    case "financing": {
      const svcImpl =
        debt.amortizationMethod === "PRICE" ? PriceAmortizationService : SacAmortizationService;
      const s = svcImpl.generate({
        principal: debt.originalPrincipal,
        annualRate: debt.annualInterestRate,
        termMonths: debt.termMonths,
      });
      if (!isOk(s)) return err(s.error);
      const first = s.value.installmentAt(1);
      if (!first) {
        return err(new InvalidAmortizationParamsError("Sem parcela 1 para financiamento."));
      }
      return ok(first.installment.toNumber());
    }
    case "personal_loan":
      return ok(debt.monthlyInstallment.toNumber());
    case "credit_card": {
      const stmt = debt.currentStatement.toNumber();
      if (stmt > 0) return ok(stmt * CREDIT_CARD_MIN_PCT);
      const monthlyRate = debt.revolvingMonthlyRate?.toDecimal() ?? 0;
      return ok(Math.max(0, debt.currentBalance.toNumber() * monthlyRate));
    }
    case "overdraft":
      return ok(debt.currentBalance.toNumber() * debt.monthlyRate.toDecimal());
    case "recurring": {
      const amountCents = Number(debt.recurringAmountCents ?? 0n);
      // amountCents é em centavos; Money.from espera reais.
      const amountReais = amountCents / 100;
      if (debt.recurringFrequency === "weekly") {
        return ok(amountReais * WEEKS_PER_MONTH);
      }
      return ok(amountReais);
    }
  }
}
