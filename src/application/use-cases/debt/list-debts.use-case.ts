import type { DebtEntity, DebtStatus } from "@/domain/entities/debt.entity";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface ListDebtsDeps {
  debts: DebtRepositoryPort;
}

export async function listDebts(
  deps: ListDebtsDeps,
  input: { profileId: string; status?: DebtStatus | "all" },
): Promise<Result<DebtEntity[], never>> {
  const opts = input.status !== undefined ? { status: input.status } : undefined;
  const list = await deps.debts.listForProfile(input.profileId, opts);
  return ok(list);
}
