import { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { err, isOk, ok, type Result } from "@/shared/errors/result";

export interface RevolvingCostInput {
  currentBalance: Money;
  monthlyRate: InterestRate;
  monthsAhead: number; // >= 0
}

export interface RevolvingCostProjection {
  monthlyBalances: Money[]; // length = monthsAhead, balance AFTER each month
  totalAfter: Money; // monthlyBalances[monthsAhead - 1] or currentBalance if 0
  multiplier: number; // totalAfter / currentBalance (1 if 0 months or zero balance)
}

export class RevolvingCostProjectorService {
  static project(
    input: RevolvingCostInput,
  ): Result<RevolvingCostProjection, InvalidAmortizationParamsError> {
    if (!Number.isInteger(input.monthsAhead) || input.monthsAhead < 0) {
      return err(new InvalidAmortizationParamsError("monthsAhead deve ser inteiro >= 0."));
    }
    if (input.currentBalance.isNegative()) {
      return err(new InvalidAmortizationParamsError("currentBalance não pode ser negativo."));
    }

    const r = input.monthlyRate.toDecimal();
    if (!Number.isFinite(r) || r < 0) {
      return err(new InvalidAmortizationParamsError("Taxa mensal inválida."));
    }

    if (input.monthsAhead === 0) {
      return ok({
        monthlyBalances: [],
        totalAfter: input.currentBalance,
        multiplier: 1,
      });
    }

    const balances: Money[] = [];
    const startNumber = input.currentBalance.toNumber();
    let runningNumber = startNumber;
    for (let k = 1; k <= input.monthsAhead; k++) {
      runningNumber = runningNumber * (1 + r);
      const m = Money.from(runningNumber);
      if (!isOk(m)) {
        return err(new InvalidAmortizationParamsError(`Valor monetário inválido no mês ${k}.`));
      }
      balances.push(m.value);
    }
    const totalAfter = balances[balances.length - 1]!;
    // Multiplier uses the unrounded final value so it reflects the
    // pure compound-growth factor (1 + r)^n without cent-rounding drift.
    const multiplier = startNumber === 0 ? 1 : runningNumber / startNumber;

    return ok({ monthlyBalances: balances, totalAfter, multiplier });
  }
}
