import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import type { Money } from "@/domain/value-objects/money.vo";

export interface FinancialSnapshotEntity {
  id: string;
  userId: string;
  asOfDate: Date;
  totalIncome: Money;
  totalDebtBalance: Money;
  totalMonthlyService: Money;
  monthlyFreeCashFlow: Money;
  cetWeightedAverage: InterestRate;
  incomeCommittedPct: number;
}
