import type { IncomeSettlementEntity } from "@/domain/entities/income-settlement.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import {
  effectiveIncomeCentsForMonth,
  type IncomeSettlementMonth,
} from "@/domain/services/income-settlement.service";
import { WEEKS_PER_MONTH } from "@/domain/services/monthly-frequency";

/**
 * Equivalente mensal de uma renda em centavos, com settlement aplicado.
 *
 * Zero quando o mes-alvo esta fora da janela ativa da renda (antes do mes de
 * startDate ou depois do mes de endDate): uma renda futura ou ja encerrada nao
 * entra no mes. Espelha o filtro `activeIncomes` da home, garantindo que home e
 * prescricao contem exatamente as mesmas rendas do mes.
 *
 * - monthly: valor cadastrado.
 * - weekly: valor * WEEKS_PER_MONTH (ponto de verdade unico para conversao semanal).
 * - one_off: valor quando startDate cai no mes-alvo, 0 nos demais.
 *
 * Em seguida aplica effectiveIncomeCentsForMonth para refletir ajustes do
 * fechar-mes (not_received, adjusted, received).
 */
function monthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

export function monthlyIncomeCents(
  income: IncomeEntity,
  target: IncomeSettlementMonth,
  settlements: IncomeSettlementEntity[],
): bigint {
  const targetIndex = target.year * 12 + target.month;
  if (targetIndex < monthIndex(income.startDate)) return 0n;
  if (income.endDate !== null && targetIndex > monthIndex(income.endDate)) return 0n;

  const baseReais = (() => {
    const amount = income.amount.toNumber();
    switch (income.frequency) {
      case "monthly":
        return amount;
      case "weekly":
        return amount * WEEKS_PER_MONTH;
      case "one_off": {
        const sd = income.startDate;
        return sd.getUTCFullYear() === target.year && sd.getUTCMonth() === target.month
          ? amount
          : 0;
      }
    }
  })();

  if (baseReais <= 0) return 0n;

  const baseCents = BigInt(Math.round(baseReais * 100));
  return effectiveIncomeCentsForMonth(income.id, baseCents, target, settlements);
}
