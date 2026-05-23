import type { IncomeEntity, IncomeFrequency } from "@/domain/entities/income.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors";

export interface RegisterIncomeDeps {
  incomes: IncomeRepository;
  clock: Clock;
}

export interface RegisterIncomeInput {
  userId: string;
  label: string;
  amount: Money;
  frequency: IncomeFrequency;
  startDate: Date;
  endDate: Date | null;
}

export async function registerIncome(
  deps: RegisterIncomeDeps,
  input: RegisterIncomeInput,
): Promise<Result<IncomeEntity, never>> {
  const now = deps.clock.now();
  const entity: IncomeEntity = {
    id: crypto.randomUUID(),
    userId: input.userId,
    label: input.label,
    amount: input.amount,
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: true,
    createdAt: now,
    deletedAt: null,
  };
  const persisted = await deps.incomes.create(entity);
  return ok(persisted);
}
