import type { DebtEntity, DebtStatus } from "@/domain/entities/debt.entity";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { ok, type Result } from "@/shared/errors";

export interface ListDebtsDeps {
  debts: DebtRepository;
}

export async function listDebts(
  deps: ListDebtsDeps,
  input: { userId: string; status?: DebtStatus | "all" },
): Promise<Result<DebtEntity[], never>> {
  const opts = input.status !== undefined ? { status: input.status } : undefined;
  const list = await deps.debts.listForUser(input.userId, opts);
  return ok(list);
}
