import type { Money } from "@/domain/value-objects/money.vo";

export interface IncomeCommittedInput {
  totalMonthlyIncome: Money;
  totalMonthlyDebtService: Money;
}

export class IncomeCommittedService {
  static compute(input: IncomeCommittedInput): number {
    if (input.totalMonthlyIncome.isZero() || input.totalMonthlyIncome.isNegative()) {
      return input.totalMonthlyDebtService.isZero() ? 0 : Number.POSITIVE_INFINITY;
    }
    const income = Number(input.totalMonthlyIncome.toCents());
    const debt = Number(input.totalMonthlyDebtService.toCents());
    return debt / income;
  }
}
