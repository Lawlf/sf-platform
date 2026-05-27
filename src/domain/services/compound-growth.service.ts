export interface CompoundGrowthInput {
  /** Valor inicial investido (centavos). */
  initialCents: bigint;
  /** Aporte mensal (centavos). */
  monthlyContributionCents: bigint;
  /** Taxa nominal ao ano (ex.: 10 = 10% a.a.). */
  annualRatePct: number;
  /** Período da projeção, em anos. */
  years: number;
}

export interface CompoundGrowthResult {
  /** Patrimônio projetado ao fim do período (centavos). */
  finalCents: bigint;
  /** Soma dos aportes no período (centavos). */
  totalContributedCents: bigint;
  /** Aportes + valor inicial: o que saiu do seu bolso (centavos). */
  totalInvestedCents: bigint;
  /** Parte do patrimônio que veio de rendimento (juros sobre juros). */
  totalInterestCents: bigint;
}

/**
 * Serviço puro de juros compostos com aportes mensais (a calculadora mais
 * usada do Brasil). Composição mensal: i = (1 + taxa anual)^(1/12) - 1.
 *
 * Fórmula fechada da anuidade: FV = inicial * (1 + i)^n + aporte * ((1 + i)^n
 * - 1) / i, com n = anos * 12. Sem I/O, sem `Date.now`, sem efeitos.
 */
export class CompoundGrowthService {
  static simulate(input: CompoundGrowthInput): CompoundGrowthResult {
    const months = Math.max(0, Math.trunc(input.years * 12));
    const initial = Number(input.initialCents) / 100;
    const contribution = Number(input.monthlyContributionCents) / 100;
    const i = Math.pow(1 + input.annualRatePct / 100, 1 / 12) - 1;

    const growth = Math.pow(1 + i, months);
    const annuityFactor = i === 0 ? months : (growth - 1) / i;
    const finalReais = initial * growth + contribution * annuityFactor;

    const finalCents = reaisToCents(finalReais);
    const totalContributedCents = input.monthlyContributionCents * BigInt(months);
    const totalInvestedCents = input.initialCents + totalContributedCents;
    const totalInterestCents = finalCents - totalInvestedCents;

    return { finalCents, totalContributedCents, totalInvestedCents, totalInterestCents };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais <= 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
