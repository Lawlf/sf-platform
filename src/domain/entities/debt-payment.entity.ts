import type { Money } from "@/domain/value-objects/money.vo";

export interface DebtPaymentEntity {
  id: string;
  debtId: string;
  paidAt: Date;
  amount: Money;
  principalPortion: Money;
  interestPortion: Money;
  isExtra: boolean;
  /**
   * Marca o pagamento sintético criado por `archiveDebt` quando uma dívida é
   * arquivada com `reason = "paid_off"` e saldo > 0. Permite que
   * `reactivateDebt` identifique e desfaça esse pagamento (deleta + restaura
   * saldo) ao reativar a dívida. Pagamentos regulares (registrados pelo
   * usuário) têm `false`.
   */
  isClosingPayment: boolean;
}
