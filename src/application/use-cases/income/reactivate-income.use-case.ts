import { Forbidden } from "@/domain/errors";
import { IncomeAlreadyActive, IncomeNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { err, ok, type Result } from "@/shared/errors";

export interface ReactivateIncomeDeps {
  incomes: IncomeRepository;
  clock?: Clock;
}

export interface ReactivateIncomeInput {
  userId: string;
  incomeId: string;
}

export async function reactivateIncome(
  deps: ReactivateIncomeDeps,
  input: ReactivateIncomeInput,
): Promise<Result<void, IncomeNotFound | Forbidden | IncomeAlreadyActive>> {
  const existing = await deps.incomes.findById(input.incomeId);
  if (!existing) return err(new IncomeNotFound("Renda nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));
  if (existing.isActive) return err(new IncomeAlreadyActive("Renda ja esta ativa."));
  if (deps.clock) {
    void deps.clock.now();
  }
  await deps.incomes.setActive(input.incomeId, true);
  return ok(undefined);
}
