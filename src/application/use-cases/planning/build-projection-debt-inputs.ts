import type { DebtEntity } from "@/domain/entities/debt.entity";
import {
  monthlyDebtService,
  monthlyRateFor,
} from "@/domain/services/financial-health.service";
import type { ProjectionDebtInput } from "@/domain/services/patrimony-projection.service";
import { isOk } from "@/shared/errors/result";

export function buildProjectionDebtInputs(debts: DebtEntity[]): ProjectionDebtInput[] {
  const result: ProjectionDebtInput[] = [];
  for (const debt of debts) {
    const svc = monthlyDebtService(debt);
    if (!isOk(svc)) continue;
    result.push({
      debtId: debt.id,
      balanceCents: debt.currentBalance.toCents(),
      monthlyRate: monthlyRateFor(debt),
      monthlyPaymentCents: BigInt(Math.round(svc.value * 100)),
    });
  }
  return result;
}
