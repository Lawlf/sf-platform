"use server";

import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { previewMonthClosing } from "@/application/use-cases/month-closing/preview-month-closing.use-case";
import { assemblePlanningView } from "@/application/use-cases/planning/assemble-planning-view";
import { buildProjectionDebtInputs } from "@/application/use-cases/planning/build-projection-debt-inputs";
import { getAnnualReport } from "@/application/use-cases/transaction/get-annual-report.use-case";
import type { GoalCascadeMode } from "@/domain/entities/goal.entity";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleFinancialPlanningSettingsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-financial-planning-settings.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleMonthClosingRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-month-closing.repository";
import { DrizzleTransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-transaction.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

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
      },
      { userId: user.id },
    ),
  ]);

  const monthlyFreeCashFlowCents = macro.contributionCents;
  const view = assemblePlanningView({
    goals,
    macro,
    assets,
    debts: buildProjectionDebtInputs(debts),
    liquidBucketAssetId: settings?.liquidBucketAssetId ?? null,
    monthlyFreeCashFlowCents,
    horizonMonths: HORIZON_MONTHS,
  });

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

export interface MonthClosingPayload {
  open: boolean;
  monthIso?: string;
  monthLabel?: string;
  theoreticalFormatted?: string;
  deltaFormatted?: string;
  leakAbsFormatted?: string;
  status?: MonthClosingStatus;
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
    },
    { userId: user.id },
  );

  if (!preview.open) return { open: false };

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
  };
}

export interface AnnualReportMonth {
  month: number;
  label: string;
  totalCents: string;
  totalFormatted: string;
}

export interface AnnualReportCategory {
  category: string | null;
  label: string;
  totalFormatted: string;
}

export interface AnnualReportPayload {
  isPro: boolean;
  year: number;
  hasData: boolean;
  totalFormatted: string;
  byMonth: AnnualReportMonth[];
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
  return {
    isPro,
    year,
    hasData: false,
    totalFormatted: Money.zero().format(),
    byMonth: [],
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
    totalFormatted: Money.fromCents(report.totalCents).format(),
    byMonth: report.byMonth.map((m) => ({
      month: m.month,
      label: SHORT_MONTH_LABELS[m.month - 1] ?? String(m.month),
      totalCents: m.totalCents.toString(),
      totalFormatted: Money.fromCents(m.totalCents).format(),
    })),
    byCategory: report.byCategory.map((c) => ({
      category: c.category,
      label: c.category ?? "Sem categoria",
      totalFormatted: Money.fromCents(c.totalCents).format(),
    })),
  };
}
