import { Forbidden } from "@/domain/errors";
import { DebtAlreadyActive, DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { err, ok, type Result } from "@/shared/errors";

export interface ReactivateDebtDeps {
  debts: DebtRepository;
  payments: DebtPaymentRepository;
  clock: Clock;
}

export interface ReactivateDebtInput {
  userId: string;
  debtId: string;
}

/**
 * Reativa uma dívida arquivada (paid_off ou written_off). Se a dívida tem
 * pagamento de fechamento ("closing payment") criado por `archiveDebt`,
 * desfaz: deleta o pagamento e restaura o saldo somando o principalPortion
 * dele de volta ao currentBalance. Se houver múltiplos closings (cenário
 * archive -> reactivate -> archive -> reactivate -> archive), apenas o mais
 * recente é desfeito; closings anteriores ficam preservados como histórico.
 *
 * Para dívidas legadas (arquivadas antes da feature de closing payment,
 * migração 0011), simplesmente troca o status para `active` sem mexer em
 * pagamentos.
 */
export async function reactivateDebt(
  deps: ReactivateDebtDeps,
  input: ReactivateDebtInput,
): Promise<Result<void, DebtNotFound | Forbidden | DebtAlreadyActive>> {
  const existing = await deps.debts.findById(input.debtId);
  if (!existing) return err(new DebtNotFound("Divida nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));
  if (existing.status === "active") return err(new DebtAlreadyActive("Divida ja esta ativa."));

  const allPayments = await deps.payments.listForDebt(input.debtId);
  const closingPayments = allPayments
    .filter((p) => p.isClosingPayment)
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
  const latestClosing = closingPayments[0];

  if (latestClosing) {
    await deps.payments.delete(latestClosing.id);
    const restoredBalance = existing.currentBalance.add(latestClosing.principalPortion);
    await deps.debts.update({
      ...existing,
      currentBalance: restoredBalance,
      status: "active",
      updatedAt: deps.clock.now(),
    });
  } else {
    await deps.debts.setStatus(input.debtId, "active");
  }

  return ok(undefined);
}
