import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ArchiveIncomeDeps {
  incomes: IncomeRepositoryPort;
}

export async function archiveIncome(
  deps: ArchiveIncomeDeps,
  input: { userId: string; profileId: string; incomeId: string },
): Promise<Result<void, IncomeNotFound | Forbidden>> {
  const existing = await deps.incomes.findById(input.incomeId);
  if (!existing) return err(new IncomeNotFound("Renda não encontrada."));
  if (existing.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));
  await deps.incomes.setActive(input.incomeId, false);
  return ok(undefined);
}
