import type { DebtEntity } from "@/domain/entities/debt.entity";
import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import type { AmortizationInstallment } from "@/domain/value-objects/amortization-schedule.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors";

export interface DebtPayoffProjectionInput {
  debt: DebtEntity;
  monthlyPayment: Money; // ordinary scheduled payment (or minimum)
  extraPayment?: Money; // optional extra applied to principal
  startingFrom: Date;
  maxMonths: number; // safety cap, e.g. 600 (50 years)
}

export interface DebtPayoffProjection {
  payoffMonth: number | null; // 1..maxMonths, null if not paid within cap
  payoffDate: Date | null;
  totalInterest: Money;
  totalPaid: Money;
  monthlySchedule: AmortizationInstallment[];
  negativeAmortization: boolean; // true if at any point payment < interest (debt grew)
}

export class DebtPayoffProjectorService {
  static project(
    input: DebtPayoffProjectionInput,
  ): Result<DebtPayoffProjection, InvalidAmortizationParamsError> {
    if (!Number.isInteger(input.maxMonths) || input.maxMonths < 1) {
      return err(new InvalidAmortizationParamsError("maxMonths deve ser inteiro >= 1."));
    }
    if (!input.monthlyPayment.isPositive() && !input.monthlyPayment.isZero()) {
      return err(new InvalidAmortizationParamsError("monthlyPayment nao pode ser negativo."));
    }
    if (input.extraPayment && input.extraPayment.isNegative()) {
      return err(new InvalidAmortizationParamsError("extraPayment nao pode ser negativo."));
    }
    if (!input.debt.currentBalance.isPositive()) {
      return err(new InvalidAmortizationParamsError("Saldo atual da divida deve ser positivo."));
    }

    const monthlyRate = monthlyRateFor(input.debt);
    if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
      return err(new InvalidAmortizationParamsError("Taxa mensal invalida para a divida."));
    }

    const monthlyPayment = input.monthlyPayment.toNumber();
    const extra = input.extraPayment ? input.extraPayment.toNumber() : 0;
    const totalMonthlyOutflow = monthlyPayment + extra;
    let balance = input.debt.currentBalance.toNumber();

    const schedule: AmortizationInstallment[] = [];
    let totalInterestNumber = 0;
    let totalPaidNumber = 0;
    let payoffMonth: number | null = null;
    let negativeAmortization = false;

    for (let month = 1; month <= input.maxMonths; month++) {
      const interest = balance * monthlyRate;
      let payment = totalMonthlyOutflow;
      let principalPortion = payment - interest;

      if (principalPortion < 0) {
        // Negative amortization: payment does not cover interest, balance grows.
        negativeAmortization = true;
      }

      let newBalance = balance - principalPortion;

      if (newBalance <= 0) {
        // Final payment: only the residual amount + interest.
        principalPortion = balance;
        payment = principalPortion + interest;
        newBalance = 0;
        payoffMonth = month;
      }

      totalInterestNumber += interest;
      totalPaidNumber += payment;

      const row = buildInstallment(month, payment, principalPortion, interest, newBalance);
      if (!isOk(row)) return err(row.error);
      schedule.push(row.value);

      balance = newBalance;
      if (payoffMonth !== null) break;
    }

    const totalInterest = Money.from(totalInterestNumber);
    const totalPaid = Money.from(totalPaidNumber);
    if (!isOk(totalInterest) || !isOk(totalPaid)) {
      return err(new InvalidAmortizationParamsError("Falha ao formatar totais da projecao."));
    }

    return ok({
      payoffMonth,
      payoffDate: payoffMonth === null ? null : addMonths(input.startingFrom, payoffMonth),
      totalInterest: totalInterest.value,
      totalPaid: totalPaid.value,
      monthlySchedule: schedule,
      negativeAmortization,
    });
  }
}

function buildInstallment(
  month: number,
  installment: number,
  principal: number,
  interest: number,
  remainingBalance: number,
): Result<AmortizationInstallment, InvalidAmortizationParamsError> {
  const im = Money.from(installment);
  const pm = Money.from(principal);
  const intm = Money.from(interest);
  const bm = Money.from(remainingBalance);
  if (!isOk(im) || !isOk(pm) || !isOk(intm) || !isOk(bm)) {
    return err(new InvalidAmortizationParamsError(`Valor monetario invalido na parcela ${month}.`));
  }
  return ok({
    month,
    installment: im.value,
    principal: pm.value,
    interest: intm.value,
    remainingBalance: bm.value,
  });
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
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
