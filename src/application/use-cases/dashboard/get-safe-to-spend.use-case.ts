import {
  BASE_CURRENCY,
  convertIncomeToBase,
} from "@/application/use-cases/fx/convert-entity-to-base";
import {
  getDashboardSnapshot,
  type GetDashboardSnapshotDeps,
} from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import type {
  FxRateUnavailableError,
  InvalidAmortizationParamsError,
} from "@/domain/errors/financial-errors";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import { monthlyIncomeCents } from "@/domain/services/income-monthly";
import {
  computeSafeToSpend,
  goalRequiredMonthlyCents,
  type ConservativeLevel,
  type SafeToSpend,
} from "@/domain/services/safe-to-spend.service";
import { isErr, ok, type Result } from "@/shared/errors/result";

export interface GetSafeToSpendDeps extends GetDashboardSnapshotDeps {
  goals: Pick<GoalRepositoryPort, "listForProfile">;
}

export async function getSafeToSpend(
  deps: GetSafeToSpendDeps,
  input: { userId: string; profileId: string; level: ConservativeLevel },
): Promise<Result<SafeToSpend, InvalidAmortizationParamsError | FxRateUnavailableError>> {
  const snap = await getDashboardSnapshot(deps, input);
  if (isErr(snap)) return snap;

  const now = deps.clock.now();
  const target = { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  const settlements = deps.incomeSettlements
    ? await deps.incomeSettlements.listForProfile(input.profileId)
    : [];

  const incomes = await deps.incomes.listForProfile(input.profileId, { onlyActive: true });
  let estimatedFullCents = 0n;
  for (const income of incomes) {
    if (!income.isEstimated) continue;
    const conv = await convertIncomeToBase(deps, input.userId, income, BASE_CURRENCY);
    if (isErr(conv)) return conv;
    estimatedFullCents += monthlyIncomeCents(conv.value, target, settlements);
  }

  const totalIncomeCents = snap.value.totalIncome.toCents();
  const guaranteedCents = totalIncomeCents - estimatedFullCents;

  const goals = await deps.goals.listForProfile(input.profileId);
  const goalRequired = goals.reduce(
    (sum, g) => sum + goalRequiredMonthlyCents(g, now),
    0n,
  );

  return ok(
    computeSafeToSpend({
      incomes: [
        { monthlyCents: guaranteedCents, isEstimated: false },
        { monthlyCents: estimatedFullCents, isEstimated: true },
      ],
      monthlyCommitmentsCents: snap.value.totalMonthlyService.toCents(),
      goalRequiredMonthlyCents: goalRequired,
      level: input.level,
    }),
  );
}
