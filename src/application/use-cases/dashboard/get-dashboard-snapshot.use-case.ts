import type { FinancialSnapshotEntity } from "@/domain/entities/financial-snapshot.entity";
import type { InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { FinancialHealthService } from "@/domain/services/financial-health.service";
import { err, isOk, ok, type Result } from "@/shared/errors";

export interface GetDashboardSnapshotDeps {
  debts: DebtRepository;
  incomes: IncomeRepository;
  clock: Clock;
}

export async function getDashboardSnapshot(
  deps: GetDashboardSnapshotDeps,
  input: { userId: string },
): Promise<Result<FinancialSnapshotEntity, InvalidAmortizationParamsError>> {
  const debts = await deps.debts.listForUser(input.userId, { status: "active" });
  const incomes = await deps.incomes.listForUser(input.userId, { onlyActive: true });
  const now = deps.clock.now();
  const r = FinancialHealthService.snapshot({
    userId: input.userId,
    incomes,
    debts,
    asOfDate: now,
  });
  if (!isOk(r)) return err(r.error);
  return ok(r.value);
}
