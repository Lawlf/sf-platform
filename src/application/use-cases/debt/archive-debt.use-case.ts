import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { DistributedLock } from "@/domain/ports/services/distributed-lock.service";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ArchiveDebtDeps {
  debts: DebtRepositoryPort;
  payments: DebtPaymentRepositoryPort;
  clock: Clock;
  lock: DistributedLock;
}

export async function archiveDebt(
  deps: ArchiveDebtDeps,
  input: {
    userId: string;
    profileId: string;
    debtId: string;
    reason: "paid_off" | "written_off";
    note?: string;
  },
): Promise<Result<void, DebtNotFound | Forbidden>> {
  return deps.lock.run(`debt:${input.debtId}`, 5_000, async () => {
    const existing = await deps.debts.findById(input.debtId);
    if (!existing) return err(new DebtNotFound("Dívida não encontrada."));
    if (existing.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

    if (existing.status !== "active") {
      // Idempotent: already archived. Avoid creating a duplicate closing payment
      // on a re-submit / concurrent click race even within the lock window.
      return ok(undefined);
    }

    if (input.reason === "paid_off" && existing.currentBalance.toCents() > 0n) {
      const now = deps.clock.now();
      const closingPayment: DebtPaymentEntity = {
        id: crypto.randomUUID(),
        debtId: existing.id,
        paidAt: now,
        amount: existing.currentBalance,
        principalPortion: existing.currentBalance,
        interestPortion: Money.zero(existing.currentBalance.currency),
        isExtra: true,
        isClosingPayment: true,
      };
      await deps.payments.create(closingPayment);
      await deps.debts.update({
        ...existing,
        currentBalance: Money.zero(existing.currentBalance.currency),
        status: "paid_off",
        updatedAt: now,
      });
    } else if (input.note !== undefined) {
      const trimmed = input.note.trim();
      await deps.debts.update({
        ...existing,
        status: input.reason,
        notes: trimmed === "" ? existing.notes : trimmed,
        updatedAt: deps.clock.now(),
      });
    } else {
      await deps.debts.setStatus(input.debtId, input.reason);
    }

    return ok(undefined);
  });
}
