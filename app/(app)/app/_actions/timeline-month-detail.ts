"use server";

import type { AssetCategory } from "@/domain/entities/asset.entity";
import type { DebtEntity, DebtKind, ExpenseCategory } from "@/domain/entities/debt.entity";
import type { IncomeFrequency } from "@/domain/entities/income.entity";
import { AssetValuationService } from "@/domain/services/asset-valuation.service";
import {
  StoryDetectionService,
  type StoryCardKind,
  type StoryIconName,
} from "@/domain/services/story-detection.service";
import { TimelineService } from "@/domain/services/timeline.service";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtAmountAdjustmentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-amount-adjustment.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

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
}

/**
 * Linha de "despesa" derivada de uma dívida do tipo `recurring`.
 * O nome do campo é mantido para compatibilidade com a UI atual; será
 * renomeado num batch futuro para `recurringOutflows`.
 */
export interface SerializedExpenseRow {
  id: string;
  label: string;
  amount: SerializedMoney;
  frequency: "monthly" | "weekly" | "annual";
  category: ExpenseCategory;
  dateIso: string;
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

const INCOME_FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  one_off: "Pontual",
};

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

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

  const debtPayments = new DrizzleDebtPaymentRepository();
  const debts = new DrizzleDebtRepository();
  const incomes = new DrizzleIncomeRepository();
  const assets = new DrizzleAssetRepository();
  const debtAmountAdjustmentsRepo = new DrizzleDebtAmountAdjustmentRepository();

  // Para detectar conquistas/marcos do mês, precisamos rodar a detecção
  // numa janela maior (24 meses antes até o mês alvo) e filtrar pra este.
  const windowFrom = (() => {
    let m = month;
    for (let i = 0; i < 24; i++) m = m.previous();
    return m;
  })();

  const [paymentsRaw, debtsRaw, incomesRaw, assetsRaw, paymentsForTimeline, adjustmentsRaw] =
    await Promise.all([
      debtPayments.listForUserInRange(user.id, { from: month.firstDay(), to: month.lastDay() }),
      debts.listForUser(user.id, { status: "all" }),
      incomes.listForUser(user.id),
      assets.findActiveByUser(user.id),
      debtPayments.listForUserInRange(user.id, {
        from: windowFrom.firstDay(),
        to: month.lastDay(),
      }),
      debtAmountAdjustmentsRepo.listForUser(user.id),
    ]);

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

  const serializedIncomes: SerializedIncomeRow[] = activeIncomes.map((inc) => {
    let date: Date;
    if (inc.frequency === "one_off") {
      date = inc.startDate;
    } else {
      date = dateInMonthFromDay(inc.startDate.getUTCDate());
    }
    return {
      id: inc.id,
      label: inc.label,
      amount: serializeMoney(inc.amount),
      frequency: inc.frequency,
      dateIso: date.toISOString(),
    };
  });

  // Compromissos recorrentes ativos no mês. Populamos o array
  // `expenses` (nome mantido por compatibilidade UI) a partir das dívidas
  // do tipo `recurring`.
  const recurringRows = debtsRaw.filter((d) => isRecurringActiveInMonth(d, month));
  const serializedExpenses: SerializedExpenseRow[] = recurringRows.map((d) => {
    const date = dateInMonthFromDay(d.startDate.getUTCDate());
    return {
      id: d.id,
      label: d.label,
      amount: serializeMoney(recurringAmountForMonth(d)),
      frequency: frequencyFor(d),
      category: d.expenseCategory ?? "other",
      dateIso: date.toISOString(),
    };
  });

  // Constroi timeline da janela e detecta conquistas/marcos
  const timeline = TimelineService.buildTimeline({
    incomes: incomesRaw,
    debts: debtsRaw,
    payments: paymentsForTimeline,
    assets: assetsRaw,
    from: windowFrom,
    to: month,
    adjustments: adjustmentsRaw,
  });

  const allStories = StoryDetectionService.detect(timeline.points);
  const monthIso = month.toIso();

  // Warnings (saldo negativo) agora vivem no modulo de Notificacoes
  // (`/app/notificacoes`), nao na linha do tempo. Filtra fora aqui para nao
  // duplicar a informacao e poupar payload trafegado.
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

  // Eventos de "cadastro no mês": derivamos do `createdAt` das entidades
  // (assets, incomes, debts). MVP simples sem tabela `events` dedicada.
  const events: SerializedTimelineEvent[] = [];

  for (const asset of assetsRaw) {
    const createdMonth = MonthYear.fromDate(asset.createdAt);
    if (createdMonth.equals(month)) {
      events.push({
        id: `asset-${asset.id}`,
        kind: "asset_added",
        label: asset.label,
        detail: ASSET_CATEGORY_LABEL[asset.category],
        dateIso: asset.createdAt.toISOString(),
        href: `/app/patrimonio/${asset.id}`,
        amount: serializeMoney(AssetValuationService.computeCurrentValue(asset, lastDay)),
        direction: "positive",
      });
      continue;
    }

    // Revalorização (apreciação/depreciação) de ativos pré-existentes ativos no mês.
    if (asset.depreciationRatePctYear === 0) continue;
    if (!asset.purchaseDate) continue;
    const acquired = asset.acquiredAt ?? asset.createdAt;
    if (acquired > lastDay) continue;
    const valueStart = AssetValuationService.computeCurrentValue(asset, firstDay);
    const valueEnd = AssetValuationService.computeCurrentValue(asset, lastDay);
    const deltaCents = valueEnd.toCents() - valueStart.toCents();
    if (deltaCents === 0n) continue;
    const isPositive = deltaCents > 0n;
    const absCents = isPositive ? deltaCents : -deltaCents;
    events.push({
      id: `asset-revalue-${asset.id}-${month.toIso()}`,
      kind: "asset_revalued",
      label: asset.label,
      detail: isPositive ? "Apreciação" : "Depreciação",
      dateIso: lastDay.toISOString(),
      href: `/app/patrimonio/${asset.id}`,
      amount: serializeMoney(Money.fromCents(absCents)),
      direction: isPositive ? "positive" : "negative",
    });
  }

  for (const inc of incomesRaw) {
    const createdMonth = MonthYear.fromDate(inc.createdAt);
    if (!createdMonth.equals(month)) continue;
    events.push({
      id: `income-${inc.id}`,
      kind: "income_added",
      label: inc.label,
      detail: `${INCOME_FREQUENCY_LABEL[inc.frequency]} ${inc.amount.format()}`,
      dateIso: inc.createdAt.toISOString(),
      href: `/app/renda`,
    });
  }

  // Só geramos event "Nova dívida" pra dívidas em curso (status `active`).
  // Dívidas já quitadas ou baixadas geram payment rows redundantes na timeline
  // (com `isClosingPayment` quando aplicável); o event de criação fica
  // suprimido pra não duplicar informação no mesmo dia.
  for (const debt of debtsRaw) {
    if (debt.status !== "active") continue;
    const createdMonth = MonthYear.fromDate(debt.createdAt);
    if (!createdMonth.equals(month)) continue;
    const detailParts: string[] = [DEBT_KIND_LABEL[debt.kind]];
    if (debt.kind === "recurring" && debt.recurringAmountCents !== null) {
      detailParts.push(Money.fromCents(debt.recurringAmountCents).format());
    } else if (debt.originalPrincipal.toCents() > 0n) {
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
