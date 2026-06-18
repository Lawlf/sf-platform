import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import {
  BASE_CURRENCY,
  convertAssetToBase,
  convertDebtToBase,
  convertIncomeToBase,
  convertPaymentToBase,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { MonthClosingRepositoryPort } from "@/domain/ports/repositories/month-closing.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import {
  ReconciliationService,
  type ReconciliationStatus,
} from "@/domain/services/reconciliation.service";
import { TimelineService } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { getOpenMonth } from "./get-open-month.use-case";

export interface MonthClosingDeps {
  closings: MonthClosingRepositoryPort;
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  debts: DebtRepositoryPort;
  incomes: IncomeRepositoryPort;
  payments: DebtPaymentRepositoryPort;
  clock: Clock;
  rates: ExchangeRateRepositoryPort;
  overrides: UserFxOverrideRepositoryPort;
}

export interface ComputedMonthClosing {
  monthIso: string;
  theoreticalFreeCashFlowCents: bigint;
  baselineNetWorthCents: bigint;
  endNetWorthCents: bigint;
  leakCents: bigint;
  status: ReconciliationStatus;
  endDebtBalanceCents: bigint;
  endReserveCents: bigint;
  committedPctBps: number;
}

export type PreviewMonthClosingResult =
  | { open: false }
  | ({ open: true } & ComputedMonthClosing);

/**
 * Núcleo compartilhado por `previewMonthClosing` e `closeMonth`: detecta o mês
 * aberto, calcula saldo livre teórico, patrimônio atual (fim), baseline e
 * vazamento. Centralizado num único helper para que preview e fechamento nunca
 * divirjam. Retorna `null` quando não há mês a fechar.
 */
export async function computeMonthClosing(
  deps: MonthClosingDeps,
  input: { userId: string; profileId: string },
): Promise<ComputedMonthClosing | null> {
  const open = await getOpenMonth(
    { closings: deps.closings, clock: deps.clock },
    { profileId: input.profileId },
  );
  if (!open) return null;

  const snapshotResult = await getDashboardSnapshot(
    {
      debts: deps.debts,
      incomes: deps.incomes,
      clock: deps.clock,
      rates: deps.rates,
      overrides: deps.overrides,
    },
    { userId: input.userId, profileId: input.profileId },
  );
  const theoreticalFreeCashFlowCents = isOk(snapshotResult)
    ? snapshotResult.value.monthlyFreeCashFlow.toCents()
    : 0n;

  const netWorthResult = await getNetWorth(
    {
      assets: deps.assets,
      allocations: deps.allocations,
      debts: deps.debts,
      rates: deps.rates,
      overrides: deps.overrides,
      clock: deps.clock,
    },
    { userId: input.userId, profileId: input.profileId },
  );
  const endNetWorthCents = isOk(netWorthResult)
    ? netWorthResult.value.netWorth.toCents()
    : 0n;

  const endDebtBalanceCents = isOk(snapshotResult)
    ? snapshotResult.value.totalDebtBalance.toCents()
    : 0n;
  const committedPctBps = isOk(snapshotResult)
    ? clampCommittedBps(snapshotResult.value.incomeCommittedPct)
    : 0;

  const assetsForReserve = await deps.assets.findActiveByProfile(input.profileId);
  const endReserveCents = assetsForReserve
    .filter((a) => a.category === "cash")
    .reduce((sum, a) => sum + a.currentValue.toCents(), 0n);

  const baselineNetWorthCents = await resolveBaseline(deps, input.userId, input.profileId, open.openMonthIso);

  const { leakCents, status } = ReconciliationService.compute({
    theoreticalFreeCashFlowCents,
    netWorthDeltaCents: endNetWorthCents - baselineNetWorthCents,
  });

  return {
    monthIso: open.openMonthIso,
    theoreticalFreeCashFlowCents,
    baselineNetWorthCents,
    endNetWorthCents,
    leakCents,
    status,
    endDebtBalanceCents,
    endReserveCents,
    committedPctBps,
  };
}

/**
 * Baseline = patrimônio no início do mês aberto (= fim do mês anterior).
 * Reusa `endNetWorthCents` do fechamento anterior quando ele é exatamente o mês
 * que precede o aberto; caso contrário (primeiro fechamento), computa via
 * timeline o patrimônio do mês anterior.
 */
const COMMITTED_BPS_CAP = 100000;

function clampCommittedBps(fraction: number): number {
  if (!Number.isFinite(fraction)) return COMMITTED_BPS_CAP;
  const bps = Math.round(fraction * 10000);
  return Math.max(0, Math.min(COMMITTED_BPS_CAP, bps));
}

async function resolveBaseline(
  deps: MonthClosingDeps,
  userId: string,
  profileId: string,
  openMonthIso: string,
): Promise<bigint> {
  const latest = await deps.closings.latest(profileId);
  if (latest && MonthYear.fromDate(latest.month).next().toIso() === openMonthIso) {
    return latest.endNetWorthCents;
  }

  const prevMonth = MonthYear.fromIso(openMonthIso).previous();
  const [incomes, debts, payments, assets] = await Promise.all([
    deps.incomes.listForProfile(profileId),
    deps.debts.listForProfile(profileId, { status: "all" }),
    deps.payments.listForProfileInRange(profileId, {
      from: prevMonth.firstDay(),
      to: prevMonth.lastDay(),
    }),
    deps.assets.findActiveByProfile(profileId),
  ]);

  const convertedIncomes: IncomeEntity[] = [];
  for (const inc of incomes) {
    const r = await convertIncomeToBase(deps, userId, inc, BASE_CURRENCY);
    if (isErr(r)) return 0n;
    convertedIncomes.push(r.value);
  }

  const convertedDebts: DebtEntity[] = [];
  for (const d of debts) {
    const r = await convertDebtToBase(deps, userId, d, BASE_CURRENCY);
    if (isErr(r)) return 0n;
    convertedDebts.push(r.value);
  }

  const convertedPayments: DebtPaymentEntity[] = [];
  for (const p of payments) {
    const r = await convertPaymentToBase(deps, userId, p, BASE_CURRENCY);
    if (isErr(r)) return 0n;
    convertedPayments.push(r.value);
  }

  const convertedAssets: AssetEntity[] = [];
  for (const a of assets) {
    const r = await convertAssetToBase(deps, userId, a, BASE_CURRENCY);
    if (isErr(r)) return 0n;
    convertedAssets.push(r.value);
  }

  const timeline = TimelineService.buildTimeline({
    incomes: convertedIncomes,
    debts: convertedDebts,
    payments: convertedPayments,
    assets: convertedAssets,
    from: prevMonth,
    to: prevMonth,
  });
  const point = timeline.points[0];
  return point ? point.netWorth.toCents() : 0n;
}

export async function previewMonthClosing(
  deps: MonthClosingDeps,
  input: { userId: string; profileId: string },
): Promise<PreviewMonthClosingResult> {
  const computed = await computeMonthClosing(deps, input);
  if (!computed) return { open: false };
  return { open: true, ...computed };
}
