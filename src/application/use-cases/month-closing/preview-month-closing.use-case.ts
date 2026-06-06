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
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepository } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { MonthClosingRepository } from "@/domain/ports/repositories/month-closing.repository";
import type { UserFxOverrideRepository } from "@/domain/ports/repositories/user-fx-override.repository";
import {
  ReconciliationService,
  type ReconciliationStatus,
} from "@/domain/services/reconciliation.service";
import { TimelineService } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { getOpenMonth } from "./get-open-month.use-case";

export interface MonthClosingDeps {
  closings: MonthClosingRepository;
  assets: AssetRepository;
  allocations: AssetDebtAllocationRepository;
  debts: DebtRepository;
  incomes: IncomeRepository;
  payments: DebtPaymentRepository;
  clock: Clock;
  rates: ExchangeRateRepository;
  overrides: UserFxOverrideRepository;
}

export interface ComputedMonthClosing {
  monthIso: string;
  theoreticalFreeCashFlowCents: bigint;
  baselineNetWorthCents: bigint;
  endNetWorthCents: bigint;
  leakCents: bigint;
  status: ReconciliationStatus;
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
  input: { userId: string },
): Promise<ComputedMonthClosing | null> {
  const open = await getOpenMonth(
    { closings: deps.closings, clock: deps.clock },
    { userId: input.userId },
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
    { userId: input.userId },
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
    { userId: input.userId },
  );
  const endNetWorthCents = isOk(netWorthResult)
    ? netWorthResult.value.netWorth.toCents()
    : 0n;

  const baselineNetWorthCents = await resolveBaseline(deps, input.userId, open.openMonthIso);

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
  };
}

/**
 * Baseline = patrimônio no início do mês aberto (= fim do mês anterior).
 * Reusa `endNetWorthCents` do fechamento anterior quando ele é exatamente o mês
 * que precede o aberto; caso contrário (primeiro fechamento), computa via
 * timeline o patrimônio do mês anterior.
 */
async function resolveBaseline(
  deps: MonthClosingDeps,
  userId: string,
  openMonthIso: string,
): Promise<bigint> {
  const latest = await deps.closings.latest(userId);
  if (latest && MonthYear.fromDate(latest.month).next().toIso() === openMonthIso) {
    return latest.endNetWorthCents;
  }

  const prevMonth = MonthYear.fromIso(openMonthIso).previous();
  const [incomes, debts, payments, assets] = await Promise.all([
    deps.incomes.listForUser(userId),
    deps.debts.listForUser(userId, { status: "all" }),
    deps.payments.listForUserInRange(userId, {
      from: prevMonth.firstDay(),
      to: prevMonth.lastDay(),
    }),
    deps.assets.findActiveByUser(userId),
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
  input: { userId: string },
): Promise<PreviewMonthClosingResult> {
  const computed = await computeMonthClosing(deps, input);
  if (!computed) return { open: false };
  return { open: true, ...computed };
}
