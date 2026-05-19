import type { Money } from "@/domain/value-objects/money.vo";

export interface DebtPaymentEntity {
  id: string;
  debtId: string;
  paidAt: Date;
  amount: Money;
  principalPortion: Money;
  interestPortion: Money;
  isExtra: boolean;
}
