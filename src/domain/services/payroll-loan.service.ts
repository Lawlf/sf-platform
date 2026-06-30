import { Money } from "@/domain/value-objects/money.vo";

/**
 * Saldo derivado de um empréstimo consignado (payrollDeducted): como o
 * desconto acontece direto na folha e o app suprime o registro manual de
 * pagamento, o saldo precisa cair sozinho com o tempo (senão fica congelado
 * no valor original pra sempre).
 */
export function payrollLoanCurrentBalance(
  debt: { monthlyInstallment: Money; termMonths: number; startDate: Date },
  now: Date,
): Money {
  const elapsed = Math.max(0, monthsBetween(debt.startDate, now));
  const remaining = Math.max(0, debt.termMonths - elapsed);
  return Money.fromCents(debt.monthlyInstallment.toCents() * BigInt(remaining), debt.monthlyInstallment.currency);
}

function monthsBetween(start: Date, now: Date): number {
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}
