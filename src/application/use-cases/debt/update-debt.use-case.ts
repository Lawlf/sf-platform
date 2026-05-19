import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { err, ok, type Result } from "@/shared/errors";

export interface UpdateDebtDeps {
  debts: DebtRepository;
  clock: Clock;
}

export interface UpdateDebtInput {
  userId: string;
  debtId: string;
  label?: string;
  notes?: string | null;
  // For v0.1, only label/notes/expectedEndDate are user-editable post-creation.
  expectedEndDate?: Date | null;
}

export async function updateDebt(
  deps: UpdateDebtDeps,
  input: UpdateDebtInput,
): Promise<Result<DebtEntity, DebtNotFound | Forbidden>> {
  const existing = await deps.debts.findById(input.debtId);
  if (!existing) return err(new DebtNotFound("Divida nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  const updated: DebtEntity = {
    ...existing,
    ...(input.label !== undefined && { label: input.label }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.expectedEndDate !== undefined && { expectedEndDate: input.expectedEndDate }),
    updatedAt: deps.clock.now(),
  };
  const persisted = await deps.debts.update(updated);
  return ok(persisted);
}
