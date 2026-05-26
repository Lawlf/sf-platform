import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface AmortizationInstallment {
  readonly month: number; // 1-indexed
  readonly installment: Money; // parcela total
  readonly principal: Money; // amortizacao
  readonly interest: Money; // juros
  readonly remainingBalance: Money; // saldo apos esta parcela
}

const TOLERANCE_CENTS = 1n; // +/- 1 cent rounding tolerance

export class AmortizationSchedule {
  private constructor(
    readonly installments: ReadonlyArray<AmortizationInstallment>,
    readonly originalPrincipal: Money,
  ) {}

  static from(input: {
    installments: AmortizationInstallment[];
    originalPrincipal: Money;
  }): Result<AmortizationSchedule, InvalidAmortizationParamsError> {
    const { installments, originalPrincipal } = input;

    if (installments.length === 0) {
      return err(new InvalidAmortizationParamsError("Schedule deve ter ao menos uma parcela."));
    }

    // 1. month sequence must be 1, 2, 3, ...
    for (let idx = 0; idx < installments.length; idx++) {
      const expected = idx + 1;
      if (installments[idx]!.month !== expected) {
        return err(
          new InvalidAmortizationParamsError(
            `Sequencia de meses invalida: esperado ${expected}, recebido ${installments[idx]!.month}.`,
          ),
        );
      }
    }

    // 2. each installment = principal + interest within tolerance
    for (const installmentRow of installments) {
      const expected = installmentRow.principal.toCents() + installmentRow.interest.toCents();
      const diff = installmentRow.installment.toCents() - expected;
      if (diff > TOLERANCE_CENTS || diff < -TOLERANCE_CENTS) {
        return err(
          new InvalidAmortizationParamsError(
            `Parcela ${installmentRow.month}: installment != principal + interest.`,
          ),
        );
      }
      if (installmentRow.principal.isNegative()) {
        return err(
          new InvalidAmortizationParamsError(
            `Parcela ${installmentRow.month}: principal nao pode ser negativo.`,
          ),
        );
      }
      if (installmentRow.interest.isNegative()) {
        return err(
          new InvalidAmortizationParamsError(
            `Parcela ${installmentRow.month}: juros nao pode ser negativo.`,
          ),
        );
      }
    }

    // 3. sum of principal portions reconciles with originalPrincipal within tolerance
    const principalSum = installments.reduce(
      (acc, installmentRow) => acc + installmentRow.principal.toCents(),
      0n,
    );
    const principalDiff = principalSum - originalPrincipal.toCents();
    if (principalDiff > TOLERANCE_CENTS || principalDiff < -TOLERANCE_CENTS) {
      return err(
        new InvalidAmortizationParamsError(
          `Soma das amortizacoes nao reconcilia com principal original.`,
        ),
      );
    }

    // 4. final remainingBalance must be zero within tolerance
    const last = installments[installments.length - 1]!;
    const finalBalance = last.remainingBalance.toCents();
    if (finalBalance > TOLERANCE_CENTS || finalBalance < -TOLERANCE_CENTS) {
      return err(
        new InvalidAmortizationParamsError(
          `Saldo final deve ser zero (atual: ${finalBalance} cents).`,
        ),
      );
    }

    return ok(new AmortizationSchedule(Object.freeze([...installments]), originalPrincipal));
  }

  totalPaid(): Money {
    const total = this.installments.reduce(
      (acc, installmentRow) => acc + installmentRow.installment.toCents(),
      0n,
    );
    return Money.fromCents(total);
  }

  totalInterest(): Money {
    return this.totalPaid().subtract(this.originalPrincipal);
  }

  totalPrincipal(): Money {
    const total = this.installments.reduce(
      (acc, installmentRow) => acc + installmentRow.principal.toCents(),
      0n,
    );
    return Money.fromCents(total);
  }

  termMonths(): number {
    return this.installments.length;
  }

  installmentAt(month: number): AmortizationInstallment | null {
    if (month < 1 || month > this.installments.length) return null;
    return this.installments[month - 1] ?? null;
  }
}
