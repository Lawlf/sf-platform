import {
  BASE_CURRENCY,
  convertDebtToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import { resolveFxRate } from "@/application/use-cases/fx/resolve-fx-rate.use-case";
import type { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import type { DebtAmountAdjustmentRepositoryPort } from "@/domain/ports/repositories/debt-amount-adjustment.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { FinancialPlanningSettingsRepositoryPort } from "@/domain/ports/repositories/financial-planning-settings.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { RecurringSettlementRepositoryPort } from "@/domain/ports/repositories/recurring-settlement.repository";
import { FreeBalanceService, type FreeBalanceState } from "@/domain/services/free-balance.service";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { plannedGoalReserveCents } from "@/domain/services/goal-reserve.service";
import { monthlyDebtOutflow, type TimelineSettlement } from "@/domain/services/timeline.service";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isErr, ok, type Result } from "@/shared/errors/result";

export interface FreeBalanceBreakdown {
  entrou: Money;
  jaTemDono: Money;
  /** balde acumulado: o total livre pra mexer, não só o deste evento. */
  livre: Money;
}

export interface ComputeIncomeFreeBalanceDeps extends ConvertEntityDeps {
  debts: Pick<DebtRepositoryPort, "listForProfile">;
  debtPayments: Pick<DebtPaymentRepositoryPort, "listForProfileInRange">;
  debtAmountAdjustments: Pick<DebtAmountAdjustmentRepositoryPort, "listForProfile">;
  recurringSettlements: Pick<RecurringSettlementRepositoryPort, "listForProfile">;
  settings: Pick<
    FinancialPlanningSettingsRepositoryPort,
    "findByProfile" | "upsertFreeBalanceBucket"
  >;
  goals: Pick<GoalRepositoryPort, "listForProfile">;
  goalMacro: (input: { userId: string; profileId: string }) => Promise<GoalMacro>;
  now: () => Date;
}

export interface ComputeIncomeFreeBalanceInput {
  userId: string;
  profileId: string;
  eventAmount: Money;
}

export async function computeIncomeFreeBalance(
  deps: ComputeIncomeFreeBalanceDeps,
  input: ComputeIncomeFreeBalanceInput,
): Promise<Result<FreeBalanceBreakdown, FxRateUnavailableError>> {
  const now = deps.now();
  const month = MonthYear.fromDate(now);

  const [rawDebts, paymentsThisMonth, adjustments, recurringSettlementsRaw, stored, goals] =
    await Promise.all([
      deps.debts.listForProfile(input.profileId, { status: "active" }),
      deps.debtPayments.listForProfileInRange(input.profileId, {
        from: month.firstDay(),
        to: month.lastDay(),
      }),
      deps.debtAmountAdjustments.listForProfile(input.profileId),
      deps.recurringSettlements.listForProfile(input.profileId),
      deps.settings.findByProfile(input.profileId),
      deps.goals.listForProfile(input.profileId, { status: "active" }),
    ]);

  const debts: typeof rawDebts = [];
  for (const d of rawDebts) {
    const r = await convertDebtToBase(deps, input.userId, d, BASE_CURRENCY, now);
    if (isErr(r)) return r;
    debts.push(r.value);
  }

  const settlements: TimelineSettlement[] = recurringSettlementsRaw.map((s) => ({
    debtId: s.debtId,
    monthIso: MonthYear.fromDate(s.month).toIso(),
    status: s.status,
  }));

  const outflow = monthlyDebtOutflow({
    debts,
    paymentsThisMonth,
    month,
    currentMonth: month,
    adjustments,
    settlements,
  });

  const debtOwed = outflow.reduce((sum, item) => sum.add(item.amount), Money.zero(BASE_CURRENCY));

  const reserveGoals = goals.filter((g) => g.cascadeOrder !== null && g.type !== "debt_payoff");
  let goalReserveCents = 0n;
  if (reserveGoals.length > 0) {
    const macro = await deps.goalMacro({ userId: input.userId, profileId: input.profileId });
    goalReserveCents = plannedGoalReserveCents({ goals: reserveGoals, macro, now });
  }
  const owed = debtOwed.add(Money.fromCents(goalReserveCents));

  const eventBase = await toBase(deps, input.userId, input.eventAmount, now);
  if (isErr(eventBase)) return eventBase;

  const state: FreeBalanceState = stored
    ? {
        accumulatedCents: stored.freeBalanceAccumulatedCents,
        committedCoveredCents: stored.committedCoveredCents,
        monthIso: stored.currentBucketMonth,
      }
    : { accumulatedCents: 0n, committedCoveredCents: 0n, monthIso: null };

  const result = FreeBalanceService.applyEvent(state, {
    eventAmountCents: eventBase.value.toCents(),
    owedCents: owed.toCents(),
    monthIso: month.toIso(),
  });

  await deps.settings.upsertFreeBalanceBucket(input.userId, input.profileId, {
    accumulatedCents: result.next.accumulatedCents,
    committedCoveredCents: result.next.committedCoveredCents,
    currentBucketMonth: result.next.monthIso ?? month.toIso(),
  });

  return ok({
    entrou: Money.fromCents(result.entrouCents),
    jaTemDono: Money.fromCents(result.jaTemDonoCents),
    livre: Money.fromCents(result.accumulatedCents),
  });
}

async function toBase(
  deps: ConvertEntityDeps,
  userId: string,
  amount: Money,
  asOf: Date,
): Promise<Result<Money, FxRateUnavailableError>> {
  if (amount.currency === BASE_CURRENCY) return ok(amount);
  const resolved = await resolveFxRate(deps, {
    userId,
    fromCurrency: amount.currency,
    toCurrency: BASE_CURRENCY,
    asOf,
  });
  if (isErr(resolved)) return resolved;
  return ok(amount.convert(resolved.value.rate, BASE_CURRENCY));
}
