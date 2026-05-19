import { Forbidden } from "@/domain/errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { err, ok, type Result } from "@/shared/errors";

export interface ArchiveIncomeDeps {
  incomes: IncomeRepository;
}

export async function archiveIncome(
  deps: ArchiveIncomeDeps,
  input: { userId: string; incomeId: string },
): Promise<Result<void, IncomeNotFound | Forbidden>> {
  const existing = await deps.incomes.findById(input.incomeId);
  if (!existing) return err(new IncomeNotFound("Renda nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));
  await deps.incomes.setActive(input.incomeId, false);
  return ok(undefined);
}
