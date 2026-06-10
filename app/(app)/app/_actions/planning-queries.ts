"use server";

import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { previewMonthClosing } from "@/application/use-cases/month-closing/preview-month-closing.use-case";
import { assemblePlanningView } from "@/application/use-cases/planning/assemble-planning-view";
import { getAnnualReport } from "@/application/use-cases/transaction/get-annual-report.use-case";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { GoalCascadeMode } from "@/domain/entities/goal.entity";
import type { IncomeSettlementStatus } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { RecurringSettlementStatus } from "@/domain/entities/recurring-settlement.entity";
import { recurringMonthlyEquivalent } from "@/domain/services/timeline.service";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { DrizzleFinancialPlanningSettingsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-financial-planning-settings.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income-settlement.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleMonthClosingRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-month-closing.repository";
import { DrizzleRecurringSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-recurring-settlement.repository";
import { DrizzleTransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-transaction.repository";
import { DrizzleUserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-fx-override.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const HORIZON_MONTHS = 120;

export interface SerializedProjectionPoint {
  month: number;
  netWorthFormatted: string;
  netWorthCents: string;
}

export interface SerializedGoalEta {
  goalId: string;
  title: string;
  etaMonth: number | null;
  etaLabel: string | null;
  fundingStartMonth: number | null;
}

export interface PlanningTopLine {
  kind: "growth";
  monthlyContributionFormatted: string;
}

export interface PlanningProjectionPayload {
  points: SerializedProjectionPoint[];
  goals: SerializedGoalEta[];
  topLine: PlanningTopLine | null;
  hasSignal: boolean;
}

function monthLabelFromNow(offsetMonths: number, now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  return d
    .toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    .replace(".", "")
    .replace(" de ", "/");
}

export async function fetchPlanningProjection(): Promise<PlanningProjectionPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const assetsRepo = new DrizzleAssetRepository();
  const debtsRepo = new DrizzleDebtRepository();
  const goalsRepo = new DrizzleGoalRepository();
  const settingsRepo = new DrizzleFinancialPlanningSettingsRepository();

  const [goals, assets, debts, settings, macro] = await Promise.all([
    goalsRepo.listForUser(user.id, { status: "active" }),
    assetsRepo.findActiveByUser(user.id),
    debtsRepo.listForUser(user.id, { status: "active" }),
    settingsRepo.findByUser(user.id),
    buildGoalMacro(
      {
        assets: assetsRepo,
        allocations: new DrizzleAssetDebtAllocationRepository(),
        debts: debtsRepo,
        incomes: new DrizzleIncomeRepository(),
        clock: new SystemClock(),
        rates: new DrizzleExchangeRateRepository(),
        overrides: new DrizzleUserFxOverrideRepository(),
      },
      { userId: user.id },
    ),
  ]);

  const monthlyFreeCashFlowCents = macro.contributionCents;
  const viewResult = await assemblePlanningView(
    {
      rates: new DrizzleExchangeRateRepository(),
      overrides: new DrizzleUserFxOverrideRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      goals,
      macro,
      assets,
      debts,
      liquidBucketAssetId: settings?.liquidBucketAssetId ?? null,
      monthlyFreeCashFlowCents,
      horizonMonths: HORIZON_MONTHS,
    },
  );
  if (!isOk(viewResult)) return null;
  const view = viewResult.value;

  const points: SerializedProjectionPoint[] = view.projection.points.map((p) => ({
    month: p.month,
    netWorthCents: p.netWorthCents.toString(),
    netWorthFormatted: Money.fromCents(p.netWorthCents).format(),
  }));

  const now = new Date();
  const goalById = new Map(goals.map((g) => [g.id, g] as const));
  const goalEtas: SerializedGoalEta[] = view.cascade.goals.map((c) => ({
    goalId: c.goalId,
    title: goalById.get(c.goalId)?.title ?? "Meta",
    etaMonth: c.etaMonth,
    etaLabel: c.etaMonth !== null ? monthLabelFromNow(c.etaMonth, now) : null,
    fundingStartMonth: c.fundingStartMonth,
  }));

  const topLine: PlanningTopLine | null =
    monthlyFreeCashFlowCents > 0n
      ? {
          kind: "growth",
          monthlyContributionFormatted: Money.fromCents(monthlyFreeCashFlowCents).format(),
        }
      : null;

  const hasSignal = monthlyFreeCashFlowCents > 0n || goals.length > 0;

  return { points, goals: goalEtas, topLine, hasSignal };
}

export interface PlanningCashAsset {
  id: string;
  label: string;
}

export interface PlanningGoalConfig {
  goalId: string;
  title: string;
  mode: GoalCascadeMode;
  order: number;
  parallelPct: number;
}

export interface PlanningConfigPayload {
  isPro: boolean;
  cashAssets: PlanningCashAsset[];
  liquidBucketAssetId: string | null;
  goals: PlanningGoalConfig[];
}

export async function fetchPlanningConfig(): Promise<PlanningConfigPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const assetsRepo = new DrizzleAssetRepository();
  const goalsRepo = new DrizzleGoalRepository();
  const settingsRepo = new DrizzleFinancialPlanningSettingsRepository();

  const [cashAssets, goals, settings] = await Promise.all([
    assetsRepo.findActiveByUserAndCategory(user.id, "cash"),
    goalsRepo.listForUser(user.id, { status: "active" }),
    settingsRepo.findByUser(user.id),
  ]);

  const orderedGoals = [...goals]
    .map((g, i) => ({ goal: g, fallbackOrder: i }))
    .sort((a, b) => {
      const oa = a.goal.cascadeOrder ?? a.fallbackOrder;
      const ob = b.goal.cascadeOrder ?? b.fallbackOrder;
      return oa - ob;
    });

  return {
    isPro: user.isPro,
    cashAssets: cashAssets.map((a) => ({ id: a.id, label: a.label })),
    liquidBucketAssetId: settings?.liquidBucketAssetId ?? null,
    goals: orderedGoals.map(({ goal, fallbackOrder }) => ({
      goalId: goal.id,
      title: goal.title,
      mode: goal.cascadeMode ?? "queue",
      order: goal.cascadeOrder ?? fallbackOrder,
      parallelPct: Math.round((goal.cascadeParallelPct ?? 0) * 100),
    })),
  };
}

export type MonthClosingStatus = "on_track" | "leaked" | "ahead";

export type MonthCommitmentStatus = "open" | RecurringSettlementStatus;

export interface MonthClosingCommitment {
  debtId: string;
  label: string;
  amountFormatted: string;
  status: MonthCommitmentStatus;
}

export type MonthIncomeStatus = IncomeSettlementStatus;

export interface MonthClosingIncome {
  incomeId: string;
  label: string;
  amountFormatted: string;
  amountCents: string;
  status: MonthIncomeStatus;
}

export interface MonthClosingPayload {
  open: boolean;
  monthIso?: string;
  monthLabel?: string;
  theoreticalFormatted?: string;
  deltaFormatted?: string;
  leakAbsFormatted?: string;
  status?: MonthClosingStatus;
  commitments?: MonthClosingCommitment[];
  incomes?: MonthClosingIncome[];
}

function isRecurringActiveInMonth(debt: DebtEntity, month: MonthYear): boolean {
  if (debt.kind !== "recurring") return false;
  const startMonth = MonthYear.fromDate(debt.startDate);
  if (month.isBefore(startMonth)) return false;
  if (debt.expectedEndDate) {
    const endMonth = MonthYear.fromDate(debt.expectedEndDate);
    if (month.isAfter(endMonth)) return false;
  } else if (debt.status !== "active") {
    return false;
  }
  return true;
}

const WEEKS_PER_MONTH = 4.33;

/**
 * Valor-base mensal de uma renda no mês informado (sem aplicar settlement),
 * espelhando `incomeMonthlyEquivalent` da timeline. Retorna `null` quando a
 * renda não está ativa no mês (não deve aparecer na confirmação).
 */
function incomeBaseCentsInMonth(income: IncomeEntity, month: MonthYear): bigint | null {
  const startMonth = MonthYear.fromDate(income.startDate);
  if (month.isBefore(startMonth)) return null;
  if (income.endDate) {
    const endMonth = MonthYear.fromDate(income.endDate);
    if (month.isAfter(endMonth)) return null;
  } else if (!income.isActive) {
    return null;
  }

  switch (income.frequency) {
    case "monthly":
      return income.amount.toCents();
    case "weekly":
      return BigInt(Math.round(Number(income.amount.toCents()) * WEEKS_PER_MONTH));
    case "one_off":
      return startMonth.equals(month) ? income.amount.toCents() : null;
    default:
      return null;
  }
}

function monthLabelFromIso(monthIso: string): string {
  const my = MonthYear.fromIso(monthIso);
  return my
    .toDate()
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function fetchMonthClosing(): Promise<MonthClosingPayload> {
  const user = await getCurrentUser();
  if (!user) return { open: false };

  const debtsRepo = new DrizzleDebtRepository();
  const preview = await previewMonthClosing(
    {
      closings: new DrizzleMonthClosingRepository(),
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: debtsRepo,
      incomes: new DrizzleIncomeRepository(),
      payments: new DrizzleDebtPaymentRepository(),
      clock: new SystemClock(),
      rates: new DrizzleExchangeRateRepository(),
      overrides: new DrizzleUserFxOverrideRepository(),
    },
    { userId: user.id },
  );

  if (!preview.open) return { open: false };

  const month = MonthYear.fromIso(preview.monthIso);
  const settlementsRepo = new DrizzleRecurringSettlementRepository();
  const incomeSettlementsRepo = new DrizzleIncomeSettlementRepository();
  const incomesRepo = new DrizzleIncomeRepository();
  const [debts, settlements, incomes, incomeSettlements] = await Promise.all([
    debtsRepo.listForUser(user.id, { status: "all" }),
    settlementsRepo.listForUserMonth(user.id, month.firstDay()),
    incomesRepo.listForUser(user.id),
    incomeSettlementsRepo.listForUserMonth(user.id, month.firstDay()),
  ]);

  const statusByDebtId = new Map<string, RecurringSettlementStatus>(
    settlements.map((s) => [s.debtId, s.status] as const),
  );

  const commitments: MonthClosingCommitment[] = debts
    .filter((d) => isRecurringActiveInMonth(d, month))
    .map((d) => ({
      debtId: d.id,
      label: d.label,
      amountFormatted: recurringMonthlyEquivalent(d, month).format(),
      status: statusByDebtId.get(d.id) ?? "open",
    }));

  const incomeStatusById = new Map<string, IncomeSettlementStatus>(
    incomeSettlements.map((s) => [s.incomeId, s.status] as const),
  );

  const incomesForMonth: MonthClosingIncome[] = incomes
    .map((inc) => ({ inc, baseCents: incomeBaseCentsInMonth(inc, month) }))
    .filter((entry): entry is { inc: IncomeEntity; baseCents: bigint } => entry.baseCents !== null)
    .map(({ inc, baseCents }) => ({
      incomeId: inc.id,
      label: inc.label,
      amountFormatted: Money.fromCents(baseCents).format(),
      amountCents: baseCents.toString(),
      status: incomeStatusById.get(inc.id) ?? "received",
    }));

  const deltaCents = preview.endNetWorthCents - preview.baselineNetWorthCents;
  const leakAbsCents = preview.leakCents < 0n ? -preview.leakCents : preview.leakCents;

  return {
    open: true,
    monthIso: preview.monthIso,
    monthLabel: monthLabelFromIso(preview.monthIso),
    theoreticalFormatted: Money.fromCents(preview.theoreticalFreeCashFlowCents).format(),
    deltaFormatted: Money.fromCents(deltaCents).format(),
    leakAbsFormatted: Money.fromCents(leakAbsCents).format(),
    status: preview.status,
    commitments,
    incomes: incomesForMonth,
  };
}

export interface AnnualReportMonth {
  month: number;
  label: string;
  totalCents: string;
  totalFormatted: string;
}

export interface AnnualReportCategory {
  label: string;
  totalCents: string;
  totalFormatted: string;
}

export interface AnnualReportConsumo {
  essencialCents: string;
  essencialFormatted: string;
  parceladoCents: string;
  parceladoFormatted: string;
  restoCents: string;
  restoFormatted: string;
}

export interface AnnualReportPayload {
  isPro: boolean;
  year: number;
  hasData: boolean;
  excludedMovements: number;
  totalFormatted: string;
  byMonth: AnnualReportMonth[];
  consumo: AnnualReportConsumo;
  byCategory: AnnualReportCategory[];
}

const SHORT_MONTH_LABELS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function emptyAnnualReport(year: number, isPro: boolean): AnnualReportPayload {
  const zero = Money.zero().format();
  return {
    isPro,
    year,
    hasData: false,
    excludedMovements: 0,
    totalFormatted: zero,
    byMonth: [],
    consumo: {
      essencialCents: "0",
      essencialFormatted: zero,
      parceladoCents: "0",
      parceladoFormatted: zero,
      restoCents: "0",
      restoFormatted: zero,
    },
    byCategory: [],
  };
}

export async function fetchAnnualReport(): Promise<AnnualReportPayload> {
  const user = await getCurrentUser();
  const year = new Date().getUTCFullYear();
  if (!user) return emptyAnnualReport(year, false);

  const result = await getAnnualReport(
    { transactions: new DrizzleTransactionRepository() },
    { userId: user.id, year, isPro: user.isPro },
  );

  if (!result.ok) return emptyAnnualReport(year, false);

  const { report } = result;

  return {
    isPro: true,
    year,
    hasData: report.totalCents > 0n,
    excludedMovements: result.excludedMovements,
    totalFormatted: Money.fromCents(report.totalCents).format(),
    byMonth: report.byMonth.map((m) => ({
      month: m.month,
      label: SHORT_MONTH_LABELS[m.month - 1] ?? String(m.month),
      totalCents: m.totalCents.toString(),
      totalFormatted: Money.fromCents(m.totalCents).format(),
    })),
    consumo: {
      essencialCents: report.consumo.essencialCents.toString(),
      essencialFormatted: Money.fromCents(report.consumo.essencialCents).format(),
      parceladoCents: report.consumo.parceladoCents.toString(),
      parceladoFormatted: Money.fromCents(report.consumo.parceladoCents).format(),
      restoCents: report.consumo.restoCents.toString(),
      restoFormatted: Money.fromCents(report.consumo.restoCents).format(),
    },
    byCategory: report.byCategory.map((c) => ({
      label: c.category,
      totalCents: c.totalCents.toString(),
      totalFormatted: Money.fromCents(c.totalCents).format(),
    })),
  };
}
