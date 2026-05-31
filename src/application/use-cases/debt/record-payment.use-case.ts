import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import {
  DebtNotFound,
  InvalidAmortizationParamsError,
  PaymentExceedsBalanceError,
} from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { DistributedLock } from "@/domain/ports/services/distributed-lock.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RecordPaymentDeps {
  debts: DebtRepository;
  payments: DebtPaymentRepository;
  clock: Clock;
  lock: DistributedLock;
}

export interface RecordPaymentInput {
  userId: string;
  debtId: string;
  amount: Money;
  principalPortion: Money;
  interestPortion: Money;
  isExtra: boolean;
  paidAt: Date;
}

export async function recordPayment(
  deps: RecordPaymentDeps,
  input: RecordPaymentInput,
): Promise<
  Result<
    DebtPaymentEntity,
    DebtNotFound | Forbidden | InvalidAmortizationParamsError | PaymentExceedsBalanceError
  >
> {
  return deps.lock.run(`debt:${input.debtId}`, 5_000, async () => {
    const debt = await deps.debts.findById(input.debtId);
    if (!debt) return err(new DebtNotFound("Dívida não encontrada."));
    if (debt.userId !== input.userId) return err(new Forbidden("Acesso negado."));

    const sumCents = input.principalPortion.toCents() + input.interestPortion.toCents();
    if (input.amount.toCents() !== sumCents) {
      return err(
        new InvalidAmortizationParamsError(
          "amount deve ser igual a principal_portion + interest_portion.",
        ),
      );
    }

    if (input.principalPortion.toCents() > debt.currentBalance.toCents()) {
      return err(
        new PaymentExceedsBalanceError(
          `Parte do principal (${input.principalPortion.format()}) maior que saldo devedor (${debt.currentBalance.format()}).`,
        ),
      );
    }

    const newBalance = debt.currentBalance.subtract(input.principalPortion);
    const newStatus = newBalance.isZero() ? "paid_off" : debt.status;

    const updated: DebtEntity = {
      ...debt,
      currentBalance: newBalance,
      status: newStatus,
      updatedAt: deps.clock.now(),
    };
    await deps.debts.update(updated);

    const payment: DebtPaymentEntity = {
      id: crypto.randomUUID(),
      debtId: input.debtId,
      paidAt: input.paidAt,
      amount: input.amount,
      principalPortion: input.principalPortion,
      interestPortion: input.interestPortion,
      isExtra: input.isExtra,
      isClosingPayment: false,
    };
    const persisted = await deps.payments.create(payment);
    return ok(persisted);
  });
}
