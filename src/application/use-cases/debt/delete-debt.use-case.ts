import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface DeleteDebtDeps {
  debts: DebtRepositoryPort;
  payments: DebtPaymentRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  clock: Clock;
}

export interface DeleteDebtInput {
  userId: string;
  profileId: string;
  debtId: string;
}

/**
 * Apaga uma dívida do registro do usuário. Diferente de `archiveDebt`
 * (paid_off/written_off), que mantém a dívida no histórico, este use case
 * remove a dívida da visão do usuário definitivamente.
 *
 * - A dívida em si recebe soft delete (`deleted_at = now()`), atendendo
 *   LGPD/auditoria. Repositórios filtram `deleted_at IS NULL` em todas as
 *   leituras, então UI nunca enxerga a linha.
 * - Sub-records vinculados (pagamentos e alocações ativo<->dívida) são
 *   hard deletados, pois não têm valor isolado: pagamentos são histórico
 *   apenas dessa dívida, e alocações são vínculo entre ativo e dívida.
 */
export async function deleteDebt(
  deps: DeleteDebtDeps,
  input: DeleteDebtInput,
): Promise<Result<void, DebtNotFound | Forbidden>> {
  const existing = await deps.debts.findById(input.debtId);
  if (!existing) return err(new DebtNotFound("Dívida não encontrada."));
  if (existing.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  await deps.payments.deleteByDebtId(input.debtId);
  await deps.allocations.deleteByDebtId(input.debtId);
  await deps.debts.softDelete(input.debtId, deps.clock.now());

  return ok(undefined);
}
