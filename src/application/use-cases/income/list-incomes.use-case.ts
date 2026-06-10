import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface ListIncomesDeps {
  incomes: IncomeRepositoryPort;
}

export async function listIncomes(
  deps: ListIncomesDeps,
  input: { userId: string; onlyActive?: boolean },
): Promise<Result<IncomeEntity[], never>> {
  const opts = input.onlyActive !== undefined ? { onlyActive: input.onlyActive } : undefined;
  const list = await deps.incomes.listForUser(input.userId, opts);
  return ok(list);
}
