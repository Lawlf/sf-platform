export interface FinancialIndependenceInput {
  /** Patrimônio já investido hoje (centavos). */
  currentInvestedCents: bigint;
  /** Aporte mensal (centavos). */
  monthlyContributionCents: bigint;
  /** Custo de vida mensal desejado na liberdade (centavos). */
  monthlyCostOfLivingCents: bigint;
  /** Rendimento real esperado, ao ano, acima da inflação (ex.: 4 = 4% a.a.). */
  realAnnualReturnPct: number;
}

export interface FinancialIndependenceResult {
  /** Patrimônio-alvo: custo anual / taxa real (retirada perpétua, regra dos 4%). */
  targetCents: bigint;
  /** Verdadeiro quando o patrimônio atual já cobre o alvo. */
  alreadyFree: boolean;
  /** Meses até atingir o alvo; null quando fica fora do horizonte de 100 anos. */
  monthsToFreedom: number | null;
  /** Patrimônio projetado ao atingir o alvo (ou no fim do horizonte). */
  projectedCents: bigint;
  /** Soma dos aportes até a liberdade. */
  totalContributedCents: bigint;
  /** Parte do patrimônio projetado que veio de rendimento (juros sobre juros). */
  totalGrowthCents: bigint;
}

const MAX_MONTHS = 1200; // 100 anos: horizonte máximo da projeção.
// Piso da taxa real para não dividir por zero ao calcular o alvo perpétuo.
const MIN_REAL_RETURN_PCT = 0.1;

/**
 * Serviço puro para o simulador de Independência Financeira.
 *
 * Modelo: você atinge a liberdade quando o patrimônio rende, em termos reais,
 * o suficiente para cobrir seu custo de vida sem consumir o principal. Logo o
 * alvo é o custo anual dividido pela taxa de retirada real (regra dos 4% =
 * 25x o custo anual quando a taxa real é 4%).
 *
 * A acumulação compõe mês a mês: saldo = saldo * (1 + i) + aporte, com a taxa
 * mensal equivalente i = (1 + r)^(1/12) - 1. Sem I/O, sem `Date.now`, sem
 * efeitos colaterais. Cálculo em ponto flutuante (projeção, não contabilidade)
 * e arredondado para centavos no retorno.
 */
export class FinancialIndependenceService {
  static simulate(input: FinancialIndependenceInput): FinancialIndependenceResult {
    const r = Math.max(input.realAnnualReturnPct, MIN_REAL_RETURN_PCT) / 100;
    const current = centsToReais(input.currentInvestedCents);
    const contribution = centsToReais(input.monthlyContributionCents);
    const monthlyCost = centsToReais(input.monthlyCostOfLivingCents);

    const targetReais = (monthlyCost * 12) / r;
    const targetCents = reaisToCents(targetReais);

    if (current >= targetReais) {
      return {
        targetCents,
        alreadyFree: true,
        monthsToFreedom: 0,
        projectedCents: input.currentInvestedCents,
        totalContributedCents: 0n,
        totalGrowthCents: 0n,
      };
    }

    const monthlyRate = Math.pow(1 + r, 1 / 12) - 1;
    let balance = current;
    let monthsToFreedom: number | null = null;
    for (let m = 1; m <= MAX_MONTHS; m++) {
      balance = balance * (1 + monthlyRate) + contribution;
      if (balance >= targetReais) {
        monthsToFreedom = m;
        break;
      }
    }

    const reachedMonths = monthsToFreedom ?? MAX_MONTHS;
    const projectedCents = reaisToCents(balance);
    const totalContributedCents = input.monthlyContributionCents * BigInt(reachedMonths);
    const totalGrowthCents = projectedCents - input.currentInvestedCents - totalContributedCents;

    return {
      targetCents,
      alreadyFree: false,
      monthsToFreedom,
      projectedCents,
      totalContributedCents,
      totalGrowthCents,
    };
  }
}

function centsToReais(cents: bigint): number {
  return Number(cents) / 100;
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais <= 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
