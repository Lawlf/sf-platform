import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import {
  AmortizationSchedule,
  type AmortizationInstallment,
} from "@/domain/value-objects/amortization-schedule.vo";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

export interface PriceParams {
  principal: Money;
  annualRate: InterestRate;
  termMonths: number;
}

export class PriceAmortizationService {
  static generate(
    params: PriceParams,
  ): Result<AmortizationSchedule, InvalidAmortizationParamsError> {
    return generatePrice(params);
  }
}

function generatePrice(
  params: PriceParams,
): Result<AmortizationSchedule, InvalidAmortizationParamsError> {
  if (!Number.isInteger(params.termMonths) || params.termMonths < 1) {
    return err(new InvalidAmortizationParamsError("termMonths deve ser inteiro >= 1."));
  }
  if (!params.principal.isPositive()) {
    return err(new InvalidAmortizationParamsError("principal deve ser positivo."));
  }
  const i = params.annualRate.toMonthly().toDecimal();
  if (i < 0) {
    return err(new InvalidAmortizationParamsError("Taxa mensal não pode ser negativa."));
  }
  const n = params.termMonths;
  const P = params.principal.toNumber();

  const installmentValue = i === 0 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n));

  const installments: AmortizationInstallment[] = [];
  let balance = P;
  for (let month = 1; month <= n; month++) {
    const interest = balance * i;
    let principal: number;
    let installment: number;
    let balanceAfter: number;
    if (month === n) {
      principal = balance;
      installment = principal + interest;
      balanceAfter = 0;
    } else {
      principal = installmentValue - interest;
      installment = installmentValue;
      balanceAfter = balance - principal;
    }

    const row = makeInstallment(month, installment, principal, interest, balanceAfter);
    if (!isOk(row)) return err(row.error);
    installments.push(row.value);

    balance = balanceAfter;
  }

  // Absorb any cumulative rounding drift on the final installment's principal so
  // sum(principals) == originalPrincipal at the cent level. Interest on the last
  // row stays as computed; installment is recalculated as principal + interest.
  reconcileLastRow(installments, params.principal);

  return AmortizationSchedule.from({ installments, originalPrincipal: params.principal });
}

function makeInstallment(
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
    return err(new InvalidAmortizationParamsError(`Valor monetário inválido na parcela ${month}.`));
  }
  return ok({
    month,
    installment: im.value,
    principal: pm.value,
    interest: intm.value,
    remainingBalance: bm.value,
  });
}

/**
 * Absorbs cumulative cent-level rounding drift into the final installment's
 * principal portion. Re-derives that row's installment = principal + interest.
 * The remainingBalance on the last row is always zero by construction.
 */
function reconcileLastRow(installments: AmortizationInstallment[], originalPrincipal: Money): void {
  if (installments.length === 0) return;
  const sumPrincipalCents = installments.reduce((acc, row) => acc + row.principal.toCents(), 0n);
  const diff = originalPrincipal.toCents() - sumPrincipalCents;
  if (diff === 0n) return;
  const lastIdx = installments.length - 1;
  const last = installments[lastIdx]!;
  const newPrincipalCents = last.principal.toCents() + diff;
  if (newPrincipalCents < 0n) return; // unsafe to adjust; leave as-is and let schedule validate
  const newPrincipal = Money.fromCents(newPrincipalCents);
  const newInstallment = Money.fromCents(newPrincipalCents + last.interest.toCents());
  installments[lastIdx] = {
    month: last.month,
    installment: newInstallment,
    principal: newPrincipal,
    interest: last.interest,
    remainingBalance: last.remainingBalance,
  };
}
