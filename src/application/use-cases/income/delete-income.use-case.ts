import { Forbidden } from "@/domain/errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { err, ok, type Result } from "@/shared/errors";

export interface DeleteIncomeDeps {
  incomes: IncomeRepository;
  clock: Clock;
}

export interface DeleteIncomeInput {
  userId: string;
  incomeId: string;
}

/**
 * Apaga uma renda do registro do usuário. Diferente de `archiveIncome`
 * (is_active=false), que mantém a renda no histórico, este use case remove
 * a renda da visão do usuário definitivamente.
 *
 * - A renda recebe soft delete (`deleted_at = now()`), atendendo LGPD/auditoria.
 *   Repositórios filtram `deleted_at IS NULL` em todas as leituras, então a UI
 *   nunca enxerga a linha.
 * - Renda não tem sub-records (sem payments, sem allocations), então só
 *   marcamos o soft delete da própria entidade.
 */
export async function deleteIncome(
  deps: DeleteIncomeDeps,
  input: DeleteIncomeInput,
): Promise<Result<void, IncomeNotFound | Forbidden>> {
  const existing = await deps.incomes.findById(input.incomeId);
  if (!existing) return err(new IncomeNotFound("Renda nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));

  await deps.incomes.softDelete(input.incomeId, deps.clock.now());

  return ok(undefined);
}
