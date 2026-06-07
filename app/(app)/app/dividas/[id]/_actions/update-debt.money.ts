import type { UpdateDebtInput } from "@/application/use-cases/debt/update-debt.use-case";
import { type Currency, Money } from "@/domain/value-objects/money.vo";

import type { ParsedUpdate } from "./update-debt.action";

// Constrói a parte monetária da entrada de update reaproveitando a moeda da
// dívida carregada. NUNCA recai em BRL para uma dívida que já está em outra
// moeda: rebuildar com a moeda default corromperia o registro (regressão).
export function buildUpdateMoneyInput(
  d: ParsedUpdate,
  currency: Currency,
): Pick<
  UpdateDebtInput,
  | "currentBalance"
  | "monthlyInstallment"
  | "monthlyInsurance"
  | "monthlyAdminFee"
  | "creditLimit"
  | "currentStatement"
  | "revolvingBalance"
  | "installmentPurchases"
> {
  const out: Pick<
    UpdateDebtInput,
    | "currentBalance"
    | "monthlyInstallment"
    | "monthlyInsurance"
    | "monthlyAdminFee"
    | "creditLimit"
    | "currentStatement"
    | "revolvingBalance"
    | "installmentPurchases"
  > = {};
  if (d.currentBalanceCents != null) {
    out.currentBalance = Money.fromCents(d.currentBalanceCents, currency);
  }
  if (d.monthlyInstallmentCents != null) {
    out.monthlyInstallment = Money.fromCents(d.monthlyInstallmentCents, currency);
  }
  if (d.monthlyInsuranceCents !== undefined) {
    out.monthlyInsurance =
      d.monthlyInsuranceCents !== null ? Money.fromCents(d.monthlyInsuranceCents, currency) : null;
  }
  if (d.monthlyAdminFeeCents !== undefined) {
    out.monthlyAdminFee =
      d.monthlyAdminFeeCents !== null ? Money.fromCents(d.monthlyAdminFeeCents, currency) : null;
  }
  if (d.creditLimitCents != null) {
    out.creditLimit = Money.fromCents(d.creditLimitCents, currency);
  }
  if (d.currentStatementCents != null) {
    out.currentStatement = Money.fromCents(d.currentStatementCents, currency);
  }
  if (d.revolvingBalanceCents !== undefined) {
    out.revolvingBalance =
      d.revolvingBalanceCents !== null ? Money.fromCents(d.revolvingBalanceCents, currency) : null;
  }
  return out;
}
