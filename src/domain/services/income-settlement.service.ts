import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";

export interface IncomeSettlementMonth {
  /** Ano (UTC). */
  year: number;
  /** Mes 0-based (UTC), igual `Date.getUTCMonth()`. */
  month: number;
}

function monthOf(d: Date): IncomeSettlementMonth {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/**
 * Encontra o settlement de uma renda num mes especifico. Compara por
 * (incomeId, ano+mes UTC) para casar com a granularidade mensal.
 */
function settlementFor(
  settlements: IncomeSettlementEntity[],
  incomeId: string,
  target: IncomeSettlementMonth,
): IncomeSettlementEntity | undefined {
  return settlements.find((s) => {
    if (s.incomeId !== incomeId) return false;
    const m = monthOf(s.month);
    return m.year === target.year && m.month === target.month;
  });
}

/**
 * Valor efetivo (em centavos) de uma renda num mes, dado o que o usuario
 * confirmou no fechar-mes:
 *
 * - `not_received`: 0 (nao caiu).
 * - `adjusted`: `adjustedAmountCents` (ou 0 se ausente, por seguranca).
 * - `received` ou sem settlement: `baseAmountCents` (valor cadastrado).
 *
 * Puro: nao toca I/O, compara datas em UTC.
 */
export function effectiveIncomeCentsForMonth(
  incomeId: string,
  baseAmountCents: bigint,
  target: IncomeSettlementMonth,
  settlements: IncomeSettlementEntity[],
): bigint {
  const settlement = settlementFor(settlements, incomeId, target);
  if (!settlement) return baseAmountCents;
  switch (settlement.status) {
    case "not_received":
      return 0n;
    case "adjusted":
      return settlement.adjustedAmountCents ?? 0n;
    case "received":
      return baseAmountCents;
    default:
      return baseAmountCents;
  }
}
