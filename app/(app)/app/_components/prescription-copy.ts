import type {
  CascadeSegment,
  MoveType,
  PrescriptionMove,
} from "@/domain/services/prescription/prescription.types";

import { DEBT_RATE_ESTIMATES } from "../dividas/nova/_lib/debt-rate-estimates";

export interface TimelineLine {
  text: string;
  strong: boolean;
}

// Máx 4 patamares; acima vira planilha (regra ICP).
export function presentTimeline(segments: CascadeSegment[], horizonMonths: number): TimelineLine[] {
  return segments.slice(0, 4).map((seg) => {
    switch (seg.kind) {
      case "debt":
        return {
          text:
            seg.startMonth === 1
              ? `Até o mês ${seg.payoffMonth}: sua sobra vai pra ${seg.debtLabel}.`
              : `Mês ${seg.startMonth} a ${seg.payoffMonth}: sua sobra vai pra ${seg.debtLabel}.`,
          strong: false,
        };
      case "reserve":
        return {
          text: `Mês ${seg.startMonth} em diante: sem dívida cara na fila, a sobra começa a reserva.`,
          strong: true,
        };
      case "horizon_cut":
        return {
          text: `Do mês ${seg.startMonth} ao ${horizonMonths}: sua sobra segue em ${seg.debtLabel}. No ritmo atual, leva mais de um ano. A gente recalcula todo mês.`,
          strong: false,
        };
    }
  });
}

export interface MoveCopy {
  headline: string;
  impact: string;
  reason: string;
}

const MICRO_EDU: Record<MoveType, string> = {
  pay_debt: "Atacar a dívida de juro mais alto primeiro economiza mais que quitar a menor.",
  build_reserve: "Um colchão pequeno evita que um imprevisto vire dívida nova.",
  invest: "Investir a sobra todo mês rende mais que deixá-la parada na conta.",
  reduce_commitment: "Cortar um gasto fixo libera a mesma folga todo mês, não só uma vez.",
};

export function microEduFor(type: MoveType): string {
  return MICRO_EDU[type];
}

const brl = (reais: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Math.round(reais * 100) / 100,
  );

const monthsLabel = (n: number): string => (n === 1 ? "1 mês" : `${n} meses`);

export type TightKind = "deficit" | "over_committed" | "squeezed";

export function tightKindOf(args: { committedPct: number; freeBalanceReais: number }): TightKind {
  if (args.freeBalanceReais < 0) return "deficit";
  if (args.committedPct >= 100 && args.freeBalanceReais <= 0) return "over_committed";
  return "squeezed";
}

export function presentMove(
  m: PrescriptionMove,
  ctx?: { committedPct?: number; freeBalanceReais?: number },
): MoveCopy {
  switch (m.type) {
    case "pay_debt": {
      const label = m.targetDebtLabel ?? "sua dívida mais cara";
      const reason = m.metrics.rateEstimated
        ? `Estimamos os juros do cartão em ~${DEBT_RATE_ESTIMATES.creditCardRevolving.valuePct}% ao mês, a média do mercado.`
        : "Com as dívidas que você registrou, essa é a de juro mais alto.";
      const headline = `Coloque sua sobra na ${label} primeiro.`;
      if (m.metrics.baselineNeverPayoff) {
        const months = m.metrics.monthsToPayoff;
        return {
          headline,
          impact:
            months != null
              ? `Pagando só o mínimo, ela não quita. Com sua sobra, você zera em ${monthsLabel(months)}.`
              : "Pagando só o mínimo, o saldo não cai. Sua sobra acelera a quitação.",
          reason,
        };
      }
      const saved = m.metrics.interestSavedReais ?? 0;
      const months = m.metrics.monthsSaved ?? 0;
      return {
        headline,
        impact: `Você economiza ${brl(saved)} em juros e antecipa a quitação em ${monthsLabel(months)}.`,
        reason,
      };
    }
    case "build_reserve": {
      const gap = m.metrics.reserveGapReais ?? 0;
      const months = m.metrics.monthsToReserve;
      const minSafety = m.reasonCode === "below_min_safety";
      return {
        headline: minSafety
          ? "Junte um colchão pequeno antes de atacar a dívida."
          : "Direcione sua sobra para a reserva de emergência.",
        impact:
          months == null
            ? `Faltam ${brl(gap)} para o seu colchão ficar completo.`
            : `Faltam ${brl(gap)}, cerca de ${monthsLabel(months)} no seu ritmo.`,
        reason: minSafety
          ? "Com os dados que você registrou, vale ter um mínimo de segurança antes de atacar a dívida."
          : "Com os dados que você registrou, sua reserva ainda não cobre um imprevisto.",
      };
    }
    case "invest": {
      const monthly = m.metrics.monthlyContributionReais ?? 0;
      const growth = m.metrics.projectedGrowthReais ?? 0;
      return {
        headline: `Sua sobra pode render: comece com ${brl(monthly)} por mês.`,
        impact: `Em 12 meses, isso pode render cerca de ${brl(growth)}.`,
        reason: "Com os dados que você registrou, você não tem dívida cara e a reserva está completa.",
      };
    }
    case "reduce_commitment": {
      const cut = m.metrics.targetReductionReais ?? 0;
      const free = ctx?.freeBalanceReais ?? (m.reasonCode === "negative_free_balance" ? -1 : 0);
      const kind = tightKindOf({ committedPct: ctx?.committedPct ?? 0, freeBalanceReais: free });
      if (kind === "deficit") {
        return {
          headline: "Este mês sai mais do que entra.",
          impact: `Faltam ${brl(cut)} pra fechar o mês. Cortar ou renegociar a maior parcela já alivia tudo.`,
          reason: "Com o que você registrou, o passo agora é reduzir um gasto fixo para o mês fechar.",
        };
      }
      if (kind === "over_committed") {
        return {
          headline: "Suas parcelas sozinhas já passam a renda.",
          impact: `Cortar cerca de ${brl(cut)} por mês deixa a renda cobrir as parcelas de novo.`,
          reason: "Com o que você registrou, renegociar prazo ou juros de uma parcela alivia todo mês.",
        };
      }
      return {
        headline: "Você fecha o mês, mas no limite.",
        impact:
          free > 0
            ? `Sobram só ${brl(free)} neste mês. Cortar uma parcela muda esse número todo mês.`
            : "O mês fecha quase no zero. Cortar uma parcela já abre uma folga real.",
        reason: "Com o que você registrou, vale abrir um pouco de folga antes de pensar em guardar.",
      };
    }
  }
}
