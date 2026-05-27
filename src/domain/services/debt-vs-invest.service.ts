export interface DebtVsInvestInput {
  /** Quantia disponível a aplicar numa das duas escolhas (centavos). */
  amountCents: bigint;
  /** Custo efetivo da dívida, ao ano (ex.: 20 = 20% a.a.). */
  debtAnnualRatePct: number;
  /** Rendimento líquido do investimento, ao ano (ex.: 10 = 10% a.a.). */
  investAnnualRatePct: number;
  /** Horizonte de comparação, em meses. */
  monthsHorizon: number;
}

export type DebtVsInvestRecommendation = "quitar" | "investir" | "empate";

export interface DebtVsInvestResult {
  /** Juros que deixam de correr na dívida ao amortizar agora (centavos). */
  debtInterestSavedCents: bigint;
  /** Rendimento que o investimento geraria no mesmo período (centavos). */
  investEarnedCents: bigint;
  /** Qual escolha rende mais, decidida pela comparação das taxas. */
  recommendation: DebtVsInvestRecommendation;
  /** Vantagem em reais da escolha recomendada sobre a outra (centavos). */
  advantageCents: bigint;
}

const RATE_TOLERANCE = 1e-9;

/**
 * Serviço puro: amortizar dívida vs investir a mesma quantia.
 *
 * Amortizar uma dívida "rende" o juro que aquela parte deixaria de gerar.
 * Logo a decisão é uma comparação de taxas: se a dívida cobra mais do que o
 * investimento rende, quitar ganha; senão, investir ganha. Os valores em reais
 * (juros evitados vs rendimento) tornam a diferença tangível ao longo do
 * horizonte. Sem I/O, sem `Date.now`, sem efeitos colaterais.
 */
export class DebtVsInvestService {
  static simulate(input: DebtVsInvestInput): DebtVsInvestResult {
    const rDebt = input.debtAnnualRatePct / 100;
    const rInvest = input.investAnnualRatePct / 100;
    const years = input.monthsHorizon / 12;
    const amount = Number(input.amountCents) / 100;

    const debtSaved = amount * (Math.pow(1 + rDebt, years) - 1);
    const investEarned = amount * (Math.pow(1 + rInvest, years) - 1);

    const debtInterestSavedCents = reaisToCents(debtSaved);
    const investEarnedCents = reaisToCents(investEarned);

    let recommendation: DebtVsInvestRecommendation = "empate";
    if (rDebt - rInvest > RATE_TOLERANCE) recommendation = "quitar";
    else if (rInvest - rDebt > RATE_TOLERANCE) recommendation = "investir";

    const advantageCents =
      debtInterestSavedCents > investEarnedCents
        ? debtInterestSavedCents - investEarnedCents
        : investEarnedCents - debtInterestSavedCents;

    return { debtInterestSavedCents, investEarnedCents, recommendation, advantageCents };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais <= 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
