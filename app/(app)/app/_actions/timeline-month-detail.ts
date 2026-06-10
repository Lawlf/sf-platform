"use server";

import { normalizeLegacyExpenseCategory } from "@/domain/categories/default-categories";
import type { AssetCategory, AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity, DebtKind, ExpenseCategory } from "@/domain/entities/debt.entity";
import { AssetValuationService } from "@/domain/services/asset-valuation.service";
import { effectiveIncomeCentsForMonth } from "@/domain/services/income-settlement.service";
import {
  StoryDetectionService,
  type StoryCardKind,
  type StoryIconName,
} from "@/domain/services/story-detection.service";
import {
  nonRecurringMonthlyObligation,
  TimelineService,
  type TimelineSettlement,
} from "@/domain/services/timeline.service";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { dateOnlyFormat } from "@/shared/format/date-only";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface SerializedPaymentRow {
  id: string;
  debtId: string;
  debtLabel: string;
  amount: SerializedMoney;
  paidAtIso: string;
  paidAtLabel: string;
  dateIso: string;
  isClosingPayment: boolean;
}

export interface SerializedIncomeRow {
  id: string;
  label: string;
  amount: SerializedMoney;
  frequency: "monthly" | "weekly" | "one_off";
  dateIso: string;
  isNew: boolean;
  /** A renda foi confirmada como não recebida no fechar-mês daquele mês. */
  notReceived?: boolean;
}

/**
 * Linha de "despesa" derivada de uma dívida do tipo `recurring`.
 * O nome do campo é mantido para compatibilidade com a UI atual; será
 * renomeado num batch futuro para `recurringOutflows`.
 */
export interface SerializedExpenseRow {
  id: string;
  debtId: string;
  label: string;
  amount: SerializedMoney;
  frequency: "monthly" | "weekly" | "annual";
  category: ExpenseCategory;
  dateIso: string;
  isNew: boolean;
}

export interface SerializedStoryRow {
  kind: StoryCardKind;
  monthIso: string;
  eyebrow: string;
  line: string;
  iconName: StoryIconName;
  dateIso: string;
}

export type TimelineEventKind =
  | "asset_added"
  | "income_added"
  | "debt_added"
  | "asset_revalued";

export interface SerializedTimelineEvent {
  id: string;
  kind: TimelineEventKind;
  label: string;
  detail: string;
  dateIso: string;
  href: string;
  amount?: SerializedMoney;
  direction?: "positive" | "negative";
}

export interface SerializedPatrimonySnapshot {
  netWorth: SerializedMoney;
  assetsTotal: SerializedMoney;
  debtsBalance: SerializedMoney;
}

export interface SerializedPatrimony {
  current: SerializedPatrimonySnapshot;
  previous: SerializedPatrimonySnapshot | null;
  previousMonthLabel: string | null;
}

export interface SerializedMonthDetail {
  monthIso: string;
  monthLabel: string;
  payments: SerializedPaymentRow[];
  incomes: SerializedIncomeRow[];
  expenses: SerializedExpenseRow[];
  stories: SerializedStoryRow[];
  events: SerializedTimelineEvent[];
  patrimony: SerializedPatrimony;
}

const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = {
  vehicle: "Veículo",
  real_estate: "Imóvel",
  investment: "Investimento",
  cash: "Reserva",
  other: "Outros",
};

const DEBT_KIND_LABEL: Record<DebtKind, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
  recurring: "Compromisso recorrente",
};

const DATE_FMT = dateOnlyFormat({ day: "2-digit", month: "short" });

const WEEKS_PER_MONTH = 4.33;

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

function recurringAmountForMonth(debt: DebtEntity): Money {
  if (debt.kind !== "recurring") return Money.fromCents(0n);
  const cents = debt.recurringAmountCents ?? 0n;
  if (debt.recurringFrequency === "weekly") {
    return Money.fromCents(BigInt(Math.round(Number(cents) * WEEKS_PER_MONTH)));
  }
  if (debt.recurringFrequency === "annual") {
    return Money.fromCents(BigInt(Math.round(Number(cents) / 12)));
  }
  return Money.fromCents(cents);
}

function frequencyFor(debt: DebtEntity): "monthly" | "weekly" | "annual" {
  if (debt.kind === "recurring") return debt.recurringFrequency ?? "monthly";
  return "monthly";
}

function storyDetectionWindowStart(month: MonthYear): MonthYear {
  let m = month;
  for (let i = 0; i < 24; i++) m = m.previous();
  return m;
}

function assetAddedEvent(asset: AssetEntity, lastDay: Date): SerializedTimelineEvent {
  return {
    id: `asset-${asset.id}`,
    kind: "asset_added",
    label: asset.label,
    detail: ASSET_CATEGORY_LABEL[asset.category],
    dateIso: asset.createdAt.toISOString(),
    href: `/app/patrimonio/${asset.id}`,
    amount: serializeMoney(AssetValuationService.computeCurrentValue(asset, lastDay)),
    direction: "positive",
  };
}

function assetRevaluedEvent(
  asset: AssetEntity,
  month: MonthYear,
  firstDay: Date,
  lastDay: Date,
): SerializedTimelineEvent | null {
  if (asset.depreciationRatePctYear === 0) return null;
  if (!asset.purchaseDate) return null;
  const acquired = asset.acquiredAt ?? asset.createdAt;
  if (acquired > lastDay) return null;
  const valueStart = AssetValuationService.computeCurrentValue(asset, firstDay);
  const valueEnd = AssetValuationService.computeCurrentValue(asset, lastDay);
  const deltaCents = valueEnd.toCents() - valueStart.toCents();
  if (deltaCents === 0n) return null;
  const isPositive = deltaCents > 0n;
  const absCents = isPositive ? deltaCents : -deltaCents;
  return {
    id: `asset-revalue-${asset.id}-${month.toIso()}`,
    kind: "asset_revalued",
    label: asset.label,
    detail: isPositive ? "Apreciação" : "Depreciação",
    dateIso: lastDay.toISOString(),
    href: `/app/patrimonio/${asset.id}`,
    amount: serializeMoney(Money.fromCents(absCents)),
    direction: isPositive ? "positive" : "negative",
  };
}

export async function fetchMonthDetail(input: {
  monthIso: string;
}): Promise<SerializedMonthDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  let month: MonthYear;
  try {
    month = MonthYear.fromIso(input.monthIso);
  } catch {
    return null;
  }

  const debtPayments = repos.debtPayments;
  const debts = repos.debts;
  const incomes = repos.incomes;
  const assets = repos.assets;
  const debtAmountAdjustmentsRepo = repos.debtAmountAdjustments;
  const settlementsRepo = repos.recurringSettlements;
  const incomeSettlementsRepo = repos.incomeSettlements;

  const windowFrom = storyDetectionWindowStart(month);

  const [
    paymentsRaw,
    debtsRaw,
    incomesRaw,
    assetsRaw,
    paymentsForTimeline,
    adjustmentsRaw,
    settlementsRaw,
    incomeSettlementsRaw,
  ] = await Promise.all([
    debtPayments.listForUserInRange(user.id, { from: month.firstDay(), to: month.lastDay() }),
    debts.listForUser(user.id, { status: "all" }),
    incomes.listForUser(user.id),
    assets.findActiveByUser(user.id),
    debtPayments.listForUserInRange(user.id, {
      from: windowFrom.firstDay(),
      to: month.lastDay(),
    }),
    debtAmountAdjustmentsRepo.listForUser(user.id),
    settlementsRepo.listForUser(user.id),
    incomeSettlementsRepo.listForUser(user.id),
  ]);

  const settlements: TimelineSettlement[] = settlementsRaw.map((s) => ({
    debtId: s.debtId,
    monthIso: MonthYear.fromDate(s.month).toIso(),
    status: s.status,
  }));

  const debtById = new Map(debtsRaw.map((d) => [d.id, d] as const));

  const firstDay = month.firstDay();
  const lastDay = month.lastDay();
  const daysInMonth = lastDay.getUTCDate();

  function dateInMonthFromDay(dayOfMonth: number): Date {
    const clamped = Math.min(Math.max(1, dayOfMonth), daysInMonth);
    const d = new Date(firstDay);
    d.setUTCDate(clamped);
    return d;
  }

  const serializedPayments: SerializedPaymentRow[] = paymentsRaw.map((p) => {
    const debt = debtById.get(p.debtId);
    return {
      id: p.id,
      debtId: p.debtId,
      debtLabel: debt?.label ?? "Dívida removida",
      amount: serializeMoney(p.amount),
      paidAtIso: p.paidAt.toISOString(),
      paidAtLabel: DATE_FMT.format(p.paidAt),
      dateIso: p.paidAt.toISOString(),
      isClosingPayment: p.isClosingPayment,
    };
  });

  const activeIncomes = incomesRaw.filter((inc) => {
    const startMonth = MonthYear.fromDate(inc.startDate);
    if (month.isBefore(startMonth)) return false;
    if (inc.endDate) {
      const endMonth = MonthYear.fromDate(inc.endDate);
      if (month.isAfter(endMonth)) return false;
    }
    if (inc.frequency === "one_off") return startMonth.equals(month);
    return true;
  });

  const monthTarget = { year: firstDay.getUTCFullYear(), month: firstDay.getUTCMonth() };
  const serializedIncomes: SerializedIncomeRow[] = activeIncomes.map((inc) => {
    let date: Date;
    if (inc.frequency === "one_off") {
      date = inc.startDate;
    } else {
      date = dateInMonthFromDay(inc.paymentDay ?? inc.startDate.getUTCDate());
    }
    const effectiveCents = effectiveIncomeCentsForMonth(
      inc.id,
      inc.amount.toCents(),
      monthTarget,
      incomeSettlementsRaw,
    );
    const notReceived = effectiveCents === 0n && inc.amount.toCents() > 0n;
    return {
      id: inc.id,
      label: inc.label,
      amount: serializeMoney(Money.fromCents(effectiveCents)),
      frequency: inc.frequency,
      dateIso: date.toISOString(),
      isNew: MonthYear.fromDate(inc.createdAt).equals(month),
      notReceived,
    };
  });

  const recurringRows = debtsRaw.filter((d) => isRecurringActiveInMonth(d, month));
  const serializedExpenses: SerializedExpenseRow[] = recurringRows.map((d) => {
    const recurrenceDay = d.kind === "recurring" ? d.dueDay : null;
    const date = dateInMonthFromDay(recurrenceDay ?? d.startDate.getUTCDate());
    return {
      id: d.id,
      debtId: d.id,
      label: d.label,
      amount: serializeMoney(recurringAmountForMonth(d)),
      frequency: frequencyFor(d),
      category: normalizeLegacyExpenseCategory(d.expenseCategory ?? "outros"),
      dateIso: date.toISOString(),
      isNew: MonthYear.fromDate(d.createdAt).equals(month),
    };
  });

  // Obrigação mensal projetada das dívidas não-recorrentes: sem ela, um cartão
  // recém cadastrado projetava R$ 0 no "vai sair / comprometido". Guarda
  // anti-double-count: se já há pagamento registrado da dívida neste mês, o
  // pagamento real é a verdade, não a projeção.
  const currentMonth = MonthYear.fromDate(new Date());
  const paidDebtIdsThisMonth = new Set(paymentsRaw.map((p) => p.debtId));
  for (const d of debtsRaw) {
    if (d.kind === "recurring") continue;
    if (paidDebtIdsThisMonth.has(d.id)) continue;
    const obligation = nonRecurringMonthlyObligation(d, month, currentMonth);
    if (obligation.toCents() <= 0n) continue;
    const obligationDay = d.kind === "credit_card" ? d.dueDay : d.startDate.getUTCDate();
    const date = dateInMonthFromDay(obligationDay);
    serializedExpenses.push({
      id: `obligation-${d.id}`,
      debtId: d.id,
      label: d.label,
      amount: serializeMoney(obligation),
      frequency: "monthly",
      category: "outros",
      dateIso: date.toISOString(),
      isNew: false,
    });
  }

  const timeline = TimelineService.buildTimeline({
    incomes: incomesRaw,
    debts: debtsRaw,
    payments: paymentsForTimeline,
    assets: assetsRaw,
    from: windowFrom,
    to: month,
    adjustments: adjustmentsRaw,
    settlements,
    incomeSettlements: incomeSettlementsRaw,
  });

  const allStories = StoryDetectionService.detect(timeline.points);
  const monthIso = month.toIso();

  // Warnings (saldo negativo) vivem no módulo de Notificações, não na linha
  // do tempo; filtrados aqui para não duplicar a informação.
  const monthIsComplete = month.isBefore(MonthYear.fromDate(new Date()));
  const serializedStories: SerializedStoryRow[] = monthIsComplete
    ? allStories
        .filter((s) => s.monthIso === monthIso && s.kind !== "warning")
        .map((s) => ({
          kind: s.kind,
          monthIso: s.monthIso,
          eyebrow: s.eyebrow,
          line: s.line,
          iconName: s.iconName,
          dateIso: lastDay.toISOString(),
        }))
    : [];

  // Eventos derivados do `createdAt` das entidades; MVP sem tabela `events` dedicada.
  const events: SerializedTimelineEvent[] = [];

  for (const asset of assetsRaw) {
    if (MonthYear.fromDate(asset.createdAt).equals(month)) {
      events.push(assetAddedEvent(asset, lastDay));
      continue;
    }
    const revalued = assetRevaluedEvent(asset, month, firstDay, lastDay);
    if (revalued) events.push(revalued);
  }

  // `income_added` não é emitido: a linha de renda já carrega "Nova renda" via
  // `isNew`, e o event duplicaria a mesma informação no mesmo dia.

  // Só dívidas reais em curso geram event "Nova dívida": recorrentes já aparecem
  // como linha de despesa do mês, e quitadas/baixadas já têm payment rows na
  // timeline (com `isClosingPayment` quando aplicável); emitir o event de
  // criação duplicaria a informação.
  for (const debt of debtsRaw) {
    if (debt.status !== "active") continue;
    if (debt.kind === "recurring") continue;
    const createdMonth = MonthYear.fromDate(debt.createdAt);
    if (!createdMonth.equals(month)) continue;
    const detailParts: string[] = [DEBT_KIND_LABEL[debt.kind]];
    if (debt.originalPrincipal.toCents() > 0n) {
      detailParts.push(debt.originalPrincipal.format());
    }
    events.push({
      id: `debt-${debt.id}`,
      kind: "debt_added",
      label: debt.label,
      detail: detailParts.join(" · "),
      dateIso: debt.createdAt.toISOString(),
      href: `/app/dividas/${debt.id}`,
    });
  }

  const currentPoint = timeline.points.at(-1);
  const previousPoint = timeline.points.length >= 2 ? timeline.points.at(-2) : null;
  if (!currentPoint) return null;
  const patrimony: SerializedPatrimony = {
    current: {
      netWorth: serializeMoney(currentPoint.netWorth),
      assetsTotal: serializeMoney(currentPoint.assetsTotal),
      debtsBalance: serializeMoney(currentPoint.debtsBalance),
    },
    previous: previousPoint
      ? {
          netWorth: serializeMoney(previousPoint.netWorth),
          assetsTotal: serializeMoney(previousPoint.assetsTotal),
          debtsBalance: serializeMoney(previousPoint.debtsBalance),
        }
      : null,
    previousMonthLabel: previousPoint ? previousPoint.month.format() : null,
  };

  return {
    monthIso: month.toIso(),
    monthLabel: month.format(),
    payments: serializedPayments,
    incomes: serializedIncomes,
    expenses: serializedExpenses,
    stories: serializedStories,
    events,
    patrimony,
  };
}
