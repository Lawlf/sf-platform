import {
  compareMonthKey,
  type DebtAmountAdjustmentEntity,
  monthKeyFromDate,
  type OverrideAdjustment,
  periodCovers,
  type PeriodAdjustment,
} from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";

export type MonthlyAmountSource = "override" | "period" | "base";

export interface ResolvedMonthlyAmount {
  monthKey: string; // YYYY-MM
  amount: Money;
  source: MonthlyAmountSource;
  // Para o badge na UI: quando vier de override, traz o id do ajuste; quando
  // vier de period, traz o id da faixa. Quando base, null.
  adjustmentId: string | null;
  note: string | null;
}

// Valor "base" mensal de uma dívida quando não há ajuste aplicado. Para tipos
// onde "mensal" não faz sentido isolado (overdraft, credit_card rotativo),
// retornamos zero — o usuário pode adicionar overrides explícitos. Para
// financiamento, a parcela exata depende de PRICE/SAC + insurance + admin; aqui
// retornamos zero pra simplificar e exigir override quando relevante.
export function baseMonthlyAmount(debt: DebtEntity): Money {
  switch (debt.kind) {
    case "recurring":
      return Money.fromCents(debt.recurringAmountCents);
    case "personal_loan":
      return debt.monthlyInstallment;
    case "financing":
    case "credit_card":
    case "overdraft":
      return Money.fromCents(0n);
  }
}

// Resolve o valor efetivo de um mês considerando overrides (precedência
// máxima), períodos (precedência média) e valor base (fallback).
export function resolveMonthlyAmount(
  debt: DebtEntity,
  monthKey: string,
  adjustments: DebtAmountAdjustmentEntity[],
): ResolvedMonthlyAmount {
  // Override pontual ganha sempre.
  const override = adjustments.find(
    (a): a is OverrideAdjustment => a.kind === "override" && a.month === monthKey,
  );
  if (override) {
    return {
      monthKey,
      amount: override.amount,
      source: "override",
      adjustmentId: override.id,
      note: override.note,
    };
  }

  // Períodos: se houver múltiplos cobrindo o mesmo mês, vale o mais recente
  // por startMonth (assumimos que o usuário sobrepõe faixas de propósito).
  const matchingPeriods = adjustments
    .filter((a): a is PeriodAdjustment => a.kind === "period" && periodCovers(a, monthKey))
    .sort((a, b) => compareMonthKey(b.startMonth, a.startMonth));
  const winner = matchingPeriods[0];
  if (winner) {
    return {
      monthKey,
      amount: winner.amount,
      source: "period",
      adjustmentId: winner.id,
      note: winner.note,
    };
  }

  return {
    monthKey,
    amount: baseMonthlyAmount(debt),
    source: "base",
    adjustmentId: null,
    note: null,
  };
}

// Gera lista de meses de [from, to] inclusivos no formato YYYY-MM.
export function listMonthKeysBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end) {
    out.push(monthKeyFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

// Resolve uma série mensal completa para o período [from, to].
export function resolveMonthlyTimeline(
  debt: DebtEntity,
  range: { from: Date; to: Date },
  adjustments: DebtAmountAdjustmentEntity[],
): ResolvedMonthlyAmount[] {
  const keys = listMonthKeysBetween(range.from, range.to);
  return keys.map((k) => resolveMonthlyAmount(debt, k, adjustments));
}
