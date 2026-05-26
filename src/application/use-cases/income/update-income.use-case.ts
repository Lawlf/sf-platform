import type { IncomeEntity, IncomeFrequency } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface UpdateIncomeDeps {
  incomes: IncomeRepository;
  clock: Clock;
}

export interface UpdateIncomeInput {
  userId: string;
  incomeId: string;
  label?: string;
  amount?: Money;
  frequency?: IncomeFrequency;
  startDate?: Date;
  endDate?: Date | null;
}

export async function updateIncome(
  deps: UpdateIncomeDeps,
  input: UpdateIncomeInput,
): Promise<Result<IncomeEntity, IncomeNotFound | Forbidden>> {
  const existing = await deps.incomes.findById(input.incomeId);
  if (!existing) return err(new IncomeNotFound("Renda nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  void deps.clock.now();
  const updated: IncomeEntity = {
    ...existing,
    ...(input.label !== undefined && { label: input.label }),
    ...(input.amount !== undefined && { amount: input.amount }),
    ...(input.frequency !== undefined && { frequency: input.frequency }),
    ...(input.startDate !== undefined && { startDate: input.startDate }),
    ...(input.endDate !== undefined && { endDate: input.endDate }),
  };
  const persisted = await deps.incomes.update(updated);
  return ok(persisted);
}
