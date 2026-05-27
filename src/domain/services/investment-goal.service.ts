export interface InvestmentGoalInput {
  /** Patrimônio-alvo a atingir (centavos). */
  targetCents: bigint;
  /** Quanto você já tem investido hoje (centavos). */
  initialCents: bigint;
  /** Rendimento nominal esperado, ao ano (ex.: 10 = 10% a.a.). */
  annualRatePct: number;
  /** Prazo para atingir a meta, em anos. */
  years: number;
}

export interface InvestmentGoalResult {
  /** Aporte mensal necessário para atingir a meta (centavos). */
  requiredMonthlyCents: bigint;
  /** Soma dos aportes ao longo do período (centavos). */
  totalContributedCents: bigint;
  /** Parte da meta que vem de rendimento (juros sobre juros) (centavos). */
  totalInterestCents: bigint;
  /** true quando o valor inicial já cresce até a meta sem precisar aportar. */
  alreadyReached: boolean;
}

/**
 * Serviço puro: quanto aportar por mês para atingir uma meta. É o inverso do
 * juros compostos. Resolve PMT da fórmula da anuidade:
 *   meta = inicial * (1 + i)^n + PMT * ((1 + i)^n - 1) / i
 * com i = (1 + taxa anual)^(1/12) - 1 e n = anos * 12. Sem I/O, sem efeitos.
 */
export class InvestmentGoalService {
  static compute(input: InvestmentGoalInput): InvestmentGoalResult {
    const target = Number(input.targetCents) / 100;
    const initial = Number(input.initialCents) / 100;
    const months = Math.max(1, Math.trunc(input.years * 12));
    const i = Math.pow(1 + input.annualRatePct / 100, 1 / 12) - 1;

    const growth = Math.pow(1 + i, months);
    const futureInitial = initial * growth;

    if (futureInitial >= target) {
      return {
        requiredMonthlyCents: 0n,
        totalContributedCents: 0n,
        totalInterestCents: reaisToCents(target - initial),
        alreadyReached: true,
      };
    }

    const annuityFactor = i === 0 ? months : (growth - 1) / i;
    const requiredMonthly = (target - futureInitial) / annuityFactor;

    const requiredMonthlyCents = reaisToCents(requiredMonthly);
    const totalContributedCents = requiredMonthlyCents * BigInt(months);
    const totalInterestCents = input.targetCents - input.initialCents - totalContributedCents;

    return {
      requiredMonthlyCents,
      totalContributedCents,
      totalInterestCents,
      alreadyReached: false,
    };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais <= 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
