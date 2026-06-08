import type { DebtEntity } from "@/domain/entities/debt.entity";
import { monthlyMinimumPayment, monthlyRateFor } from "@/domain/services/financial-health.service";
import { isOk } from "@/shared/errors/result";

import type { CascadeSegment } from "./prescription.types";

export type { CascadeSegment };

export interface DebtCascadeInput {
  /** Dívidas caras (já filtradas). Reordenadas por juro desc (avalanche) aqui. */
  debts: DebtEntity[];
  /** Sobra mensal que ataca a dívida-alvo. Espera-se > 0. */
  monthlyFreeBalance: number;
  startingFrom: Date;
  horizonMonths: number;
}

interface DebtState {
  label: string;
  balance: number;
  rate: number;
  min: number;
  paid: boolean;
  payoffMonth: number | null;
}

// Cascata avalanche: a sobra ataca a dívida de maior juro até quitar; o mínimo
// dela é liberado e rola pra próxima. Mantém a mesma convenção do projetor de
// uma dívida (juros = saldo*taxa, principal = pagamento - juros). Devolve os
// trechos entre transições, não 12 linhas.
export class DebtCascadeProjectorService {
  static project(input: DebtCascadeInput): CascadeSegment[] {
    const states: DebtState[] = input.debts
      .filter((d) => d.currentBalance.toNumber() > 0)
      .map((d) => ({
        label: d.label,
        balance: d.currentBalance.toNumber(),
        rate: monthlyRateFor(d),
        min: minPaymentOf(d),
        paid: false,
        payoffMonth: null,
      }))
      .sort((a, b) => b.rate - a.rate);

    if (states.length === 0) return [];

    const segments: CascadeSegment[] = [];
    let currentTarget: number | null = null;
    let segStart = 1;
    let lastDebtPayoff = 0;

    for (let month = 1; month <= input.horizonMonths; month++) {
      const targetIdx = states.findIndex((s) => !s.paid);
      if (targetIdx === -1) break;
      if (currentTarget === null) {
        currentTarget = targetIdx;
        segStart = month;
      }

      const freedMins = states.reduce((acc, s) => (s.paid ? acc + s.min : acc), 0);
      const extraPool = input.monthlyFreeBalance + freedMins;

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (!s || s.paid) continue;
        const interest = s.balance * s.rate;
        const payment = i === targetIdx ? s.min + extraPool : s.min;
        const principal = payment - interest;
        const nb = s.balance - principal;
        if (nb <= 0) {
          s.balance = 0;
          s.paid = true;
          s.payoffMonth = month;
        } else {
          s.balance = nb;
        }
      }

      const target = states[currentTarget];
      if (target && target.paid) {
        segments.push({
          kind: "debt",
          debtLabel: target.label,
          startMonth: segStart,
          payoffMonth: month,
        });
        lastDebtPayoff = month;
        currentTarget = null;
      }
    }

    if (currentTarget !== null) {
      const open = states[currentTarget];
      if (open) {
        segments.push({ kind: "horizon_cut", debtLabel: open.label, startMonth: segStart });
      }
      return segments;
    }

    if (lastDebtPayoff > 0 && lastDebtPayoff < input.horizonMonths) {
      segments.push({ kind: "reserve", startMonth: lastDebtPayoff + 1 });
    }
    return segments;
  }
}

function minPaymentOf(debt: DebtEntity): number {
  const r = monthlyMinimumPayment(debt);
  return isOk(r) ? Math.max(0, r.value) : 0;
}
