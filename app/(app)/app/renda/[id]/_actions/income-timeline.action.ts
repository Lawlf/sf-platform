"use server";

import type { IncomeSettlementStatus } from "@/domain/entities/income-settlement.entity";
import { effectiveIncomeCentsForMonth } from "@/domain/services/income-settlement.service";
import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

const DEFAULT_PAST_MONTHS = 24;
const DEFAULT_FUTURE_MONTHS = 2;

export interface SerializedIncomeMonth {
  monthKey: string;
  amountCents: string;
  status: IncomeSettlementStatus | null;
  dueDay: number | null;
}

export interface IncomeTimelinePayload {
  timeline: SerializedIncomeMonth[];
  totalReceivedCents: string;
}

function subMonths(my: MonthYear, n: number): MonthYear {
  let cursor = my;
  for (let i = 0; i < n; i++) cursor = cursor.previous();
  return cursor;
}

function addMonths(my: MonthYear, n: number): MonthYear {
  let cursor = my;
  for (let i = 0; i < n; i++) cursor = cursor.next();
  return cursor;
}

export async function loadIncomeTimeline(incomeId: string): Promise<IncomeTimelinePayload> {
  const user = await requireUser();
  const profileId = await getActiveProfileId();

  const r = await listIncomes({ incomes: repos.incomes }, { profileId });
  const income = isOk(r) ? r.value.find((i) => i.id === incomeId) : undefined;
  if (!income || income.userId !== user.id) {
    throw new Error("Renda não encontrada.");
  }

  const allSettlements = await repos.incomeSettlements.listForProfile(profileId);
  const settlements = allSettlements.filter((s) => s.incomeId === incomeId);

  const now = clock.now();
  const nowMY = MonthYear.fromDate(now);
  const startMY = MonthYear.fromDate(income.startDate);
  const endMY = income.endDate ? MonthYear.fromDate(income.endDate) : null;
  const baseCents = income.amount.toCents();

  function effectiveFor(target: MonthYear): bigint {
    return effectiveIncomeCentsForMonth(
      incomeId,
      baseCents,
      { year: target.year, month: target.month - 1 },
      settlements,
    );
  }

  function statusFor(target: MonthYear): IncomeSettlementStatus | null {
    const s = settlements.find((s) => MonthYear.fromDate(s.month).equals(target));
    return s?.status ?? null;
  }

  // Total recebido: soma desde o início real da renda até o mês atual (ou até
  // o fim, se já encerrou), nunca só a janela exibida na linha do tempo.
  let totalReceivedCents = 0n;
  const totalUpTo = endMY && endMY.isBefore(nowMY) ? endMY : nowMY;
  for (let cursor = startMY; cursor.isAtOrBefore(totalUpTo); cursor = cursor.next()) {
    totalReceivedCents += effectiveFor(cursor);
  }

  // Janela exibida: mesmo espírito da dívida (24 meses pra trás, 2 pra
  // frente), nunca antes do início real nem depois do fim, se houver.
  let fromMY = subMonths(nowMY, DEFAULT_PAST_MONTHS);
  if (startMY.isAfter(fromMY)) fromMY = startMY;
  let toMY = addMonths(nowMY, DEFAULT_FUTURE_MONTHS);
  if (endMY && endMY.isBefore(toMY)) toMY = endMY;

  if (income.frequency === "one_off") {
    fromMY = startMY;
    toMY = startMY;
  }

  const timeline: SerializedIncomeMonth[] = [];
  for (let cursor = fromMY; cursor.isAtOrBefore(toMY); cursor = cursor.next()) {
    timeline.push({
      monthKey: cursor.toIso(),
      amountCents: effectiveFor(cursor).toString(),
      status: statusFor(cursor),
      dueDay: income.paymentDay,
    });
  }

  return {
    timeline,
    totalReceivedCents: totalReceivedCents.toString(),
  };
}
