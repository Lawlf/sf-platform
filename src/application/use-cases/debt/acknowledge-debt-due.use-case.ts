import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtDueAcknowledgementEntity } from "@/domain/entities/debt-due-acknowledgement.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface AcknowledgeDebtDueDeps {
  debts: DebtRepositoryPort;
  acknowledgements: DebtDueAcknowledgementRepositoryPort;
  clock: Clock;
}

export async function acknowledgeDebtDue(
  deps: AcknowledgeDebtDueDeps,
  input: {
    userId: string;
    profileId: string;
    debtId: string;
    cycleIso: string;
    response: "paid" | "deferred";
  },
): Promise<Result<void, DebtNotFound | Forbidden>> {
  const debt = await deps.debts.findById(input.debtId);
  if (!debt) return err(new DebtNotFound("Dívida não encontrada."));
  if (debt.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  const now = deps.clock.now();
  const entity: DebtDueAcknowledgementEntity = {
    id: crypto.randomUUID(),
    userId: input.userId,
    debtId: input.debtId,
    cycleIso: input.cycleIso,
    response: input.response,
    respondedAt: now,
    createdAt: now,
  };
  await deps.acknowledgements.upsert(entity);
  return ok(undefined);
}
