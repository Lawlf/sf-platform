import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { Money } from "@/domain/value-objects/money.vo";

export interface OverdueSettlement {
  principal: Money;
  interest: Money;
}

/**
 * Divide o pagamento que o "Paguei" do alerta de vencimento registra. Retorna
 * `null` quando não há saldo a abater (recorrente estilo assinatura, ou dívida
 * já zerada): nesse caso o chamador apenas reconhece o ciclo, sem criar
 * pagamento.
 *
 * Empréstimo usa o split da parcela corrente da tabela PRICE (juros não abatem
 * saldo); cartão abate a fatura do mês como principal. O principal é limitado
 * ao saldo devedor para nunca estourar `PaymentExceedsBalanceError`.
 */
export function computeOverdueSettlement(input: {
  debt: DebtEntity;
  amortization: AmortizationSchedule | null;
  paymentsCount: number;
}): OverdueSettlement | null {
  const { debt, amortization, paymentsCount } = input;
  if (debt.kind === "recurring") return null;

  const balance = debt.currentBalance;
  if (!balance.isPositive()) return null;

  if (debt.kind === "personal_loan") {
    if (amortization) {
      const month = Math.min(paymentsCount + 1, amortization.installments.length);
      const next = amortization.installmentAt(month);
      if (next) return { principal: capTo(next.principal, balance), interest: next.interest };
    }
    return { principal: capTo(debt.monthlyInstallment, balance), interest: zeroLike(balance) };
  }

  if (debt.kind === "credit_card") {
    return { principal: capTo(debt.currentStatement, balance), interest: zeroLike(balance) };
  }

  return null;
}

function capTo(value: Money, max: Money): Money {
  return value.toCents() > max.toCents() ? max : value;
}

function zeroLike(reference: Money): Money {
  return Money.zero(reference.currency);
}
