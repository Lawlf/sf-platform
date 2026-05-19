import { Forbidden } from "@/domain/errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { err, ok, type Result } from "@/shared/errors";

export interface ArchiveDebtDeps {
  debts: DebtRepository;
}

export async function archiveDebt(
  deps: ArchiveDebtDeps,
  input: { userId: string; debtId: string; reason: "paid_off" | "written_off" },
): Promise<Result<void, DebtNotFound | Forbidden>> {
  const existing = await deps.debts.findById(input.debtId);
  if (!existing) return err(new DebtNotFound("Divida nao encontrada."));
  if (existing.userId !== input.userId) return err(new Forbidden("Acesso negado."));
  await deps.debts.setStatus(input.debtId, input.reason);
  return ok(undefined);
}
