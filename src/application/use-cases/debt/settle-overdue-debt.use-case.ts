import type { Forbidden } from "@/domain/errors/auth-errors";
import type {
  DebtNotFound,
  InvalidAmortizationParamsError,
  PaymentExceedsBalanceError,
} from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { DistributedLock } from "@/domain/ports/services/distributed-lock.service";
import { computeOverdueSettlement } from "@/domain/services/debt-settlement.service";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, isErr, ok, type Result } from "@/shared/errors/result";

import { acknowledgeDebtDue } from "./acknowledge-debt-due.use-case";
import { getDebtDetail } from "./get-debt-detail.use-case";
import { recordPayment } from "./record-payment.use-case";

export interface SettleOverdueDebtDeps {
  debts: DebtRepositoryPort;
  payments: DebtPaymentRepositoryPort;
  acknowledgements: DebtDueAcknowledgementRepositoryPort;
  clock: Clock;
  lock: DistributedLock;
  transaction?: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface SettleOverdueDebtInput {
  userId: string;
  profileId: string;
  debtId: string;
  cycleIso: string;
}

export interface SettleOverdueDebtOutput {
  outcome: "paid" | "acknowledged";
  paidOff: boolean;
  remaining: Money | null;
}

export async function settleOverdueDebt(
  deps: SettleOverdueDebtDeps,
  input: SettleOverdueDebtInput,
): Promise<
  Result<
    SettleOverdueDebtOutput,
    DebtNotFound | Forbidden | InvalidAmortizationParamsError | PaymentExceedsBalanceError
  >
> {
  const detail = await getDebtDetail(
    { debts: deps.debts, payments: deps.payments },
    { userId: input.userId, profileId: input.profileId, debtId: input.debtId },
  );
  if (isErr(detail)) return err(detail.error);

  const { debt, amortization, payments } = detail.value;
  const settlement = computeOverdueSettlement({
    debt,
    amortization,
    paymentsCount: payments.length,
  });

  if (!settlement) {
    const acked = await acknowledgeDebtDue(
      { debts: deps.debts, acknowledgements: deps.acknowledgements, clock: deps.clock },
      {
        userId: input.userId,
        profileId: input.profileId,
        debtId: input.debtId,
        cycleIso: input.cycleIso,
        response: "paid",
      },
    );
    if (isErr(acked)) return err(acked.error);
    return ok({ outcome: "acknowledged", paidOff: false, remaining: null });
  }

  const paid = await recordPayment(
    {
      debts: deps.debts,
      payments: deps.payments,
      clock: deps.clock,
      lock: deps.lock,
      ...(deps.transaction ? { transaction: deps.transaction } : {}),
    },
    {
      userId: input.userId,
      profileId: input.profileId,
      debtId: input.debtId,
      amount: settlement.principal.add(settlement.interest),
      principalPortion: settlement.principal,
      interestPortion: settlement.interest,
      isExtra: false,
      paidAt: deps.clock.now(),
    },
  );
  if (isErr(paid)) return err(paid.error);

  const settled = await deps.debts.findById(input.debtId);
  return ok({
    outcome: "paid",
    paidOff: settled?.status === "paid_off",
    remaining: settled?.currentBalance ?? null,
  });
}
