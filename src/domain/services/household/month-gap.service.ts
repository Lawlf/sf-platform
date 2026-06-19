import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import { isOk } from "@/shared/errors/result";

import { monthlyDebtService } from "@/domain/services/financial-health.service";
import { WEEKS_PER_MONTH } from "@/domain/services/monthly-frequency";

export interface MonthGapInput {
  debts: DebtEntity[];
  incomes: IncomeEntity[];
  settlements: IncomeSettlementEntity[];
  now: Date;
}

export interface MonthGapPieces {
  custosGarantidosCents: bigint;
  jaRecebidoCents: bigint;
  aReceberConfirmadoCents: bigint;
  aReceberEstimadoCents: bigint;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function settlementFor(
  settlements: IncomeSettlementEntity[],
  incomeId: string,
  target: Date,
): IncomeSettlementEntity | undefined {
  return settlements.find((s) => s.incomeId === incomeId && sameMonth(s.month, target));
}

function isIncomeActiveAt(income: IncomeEntity, asOf: Date): boolean {
  if (!income.isActive || income.deletedAt !== null) return false;
  if (income.startDate.getTime() > asOf.getTime()) return false;
  if (income.endDate !== null && income.endDate.getTime() < asOf.getTime()) return false;
  return true;
}

function monthlyEquivalentCents(income: IncomeEntity, now: Date): bigint {
  const baseCents = income.amount.toCents();
  switch (income.frequency) {
    case "monthly":
      return baseCents;
    case "weekly":
      return BigInt(Math.round(Number(baseCents) * WEEKS_PER_MONTH));
    case "one_off":
      return sameMonth(income.startDate, now) ? baseCents : 0n;
  }
}

export function monthGapPieces(input: MonthGapInput): MonthGapPieces {
  const { debts, incomes, settlements, now } = input;

  let custosGarantidosCents = 0n;
  for (const debt of debts) {
    if (debt.status !== "active") continue;
    const svc = monthlyDebtService(debt);
    if (isOk(svc)) {
      custosGarantidosCents += BigInt(Math.round(svc.value * 100));
    }
  }

  let jaRecebidoCents = 0n;
  let aReceberConfirmadoCents = 0n;
  let aReceberEstimadoCents = 0n;

  for (const income of incomes) {
    if (!isIncomeActiveAt(income, now)) continue;

    const expectedCents = monthlyEquivalentCents(income, now);
    if (expectedCents === 0n) continue;

    const settlement = settlementFor(settlements, income.id, now);

    if (settlement) {
      switch (settlement.status) {
        case "received":
          jaRecebidoCents += expectedCents;
          break;
        case "adjusted":
          jaRecebidoCents += settlement.adjustedAmountCents ?? 0n;
          break;
        case "not_received":
          break;
      }
    } else {
      if (income.isEstimated) {
        aReceberEstimadoCents += expectedCents;
      } else {
        aReceberConfirmadoCents += expectedCents;
      }
    }
  }

  return {
    custosGarantidosCents,
    jaRecebidoCents,
    aReceberConfirmadoCents,
    aReceberEstimadoCents,
  };
}
