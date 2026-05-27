import type { PrescriptionMove } from "@/domain/services/prescription/prescription.types";

export interface MoveCopy {
  headline: string;
  impact: string;
  reason: string;
}

const brl = (reais: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Math.round(reais * 100) / 100,
  );

const monthsLabel = (n: number): string => (n === 1 ? "1 mês" : `${n} meses`);

export function presentMove(m: PrescriptionMove): MoveCopy {
  switch (m.type) {
    case "pay_debt": {
      const label = m.targetDebtLabel ?? "sua dívida mais cara";
      const reason = "Com as dívidas que você registrou, essa é a de juro mais alto.";
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
      const negative = m.reasonCode === "negative_free_balance";
      return {
        headline: negative
          ? "Corte um gasto fixo: hoje sai mais do que entra."
          : "Corte um gasto fixo para sobrar mais no mês.",
        impact: `Cortar cerca de ${brl(cut)} por mês já reequilibra suas contas.`,
        reason: negative
          ? "Com os dados que você registrou, suas saídas passam da sua renda."
          : "Com os dados que você registrou, boa parte da sua renda já está presa em parcelas fixas.",
      };
    }
  }
}
