export interface CashVsInstallmentInput {
  /** Preço cheio (total no parcelado, sem juros) (centavos). */
  fullPriceCents: bigint;
  /** Desconto oferecido para pagamento à vista, em porcentagem. */
  discountPct: number;
  /** Número de parcelas (sem juros). */
  installments: number;
  /** Rendimento do investimento, ao ano (onde você deixaria o dinheiro). */
  annualRatePct: number;
}

export type CashVsInstallmentRecommendation = "avista" | "parcelar" | "empate";

export interface CashVsInstallmentResult {
  /** Preço à vista = cheio menos desconto (centavos). */
  cashPriceCents: bigint;
  /** Valor de cada parcela (centavos). */
  installmentValueCents: bigint;
  /** Valor presente do parcelado, descontado pelo rendimento (centavos). */
  presentValueInstallmentCents: bigint;
  recommendation: CashVsInstallmentRecommendation;
  /** Vantagem em reais da opção recomendada (centavos). */
  advantageCents: bigint;
}

const TOLERANCE_CENTS = 1n;

/**
 * Serviço puro: pagar à vista (com desconto) vs parcelar sem juros e manter o
 * dinheiro rendendo. Compara o preço à vista com o valor presente das parcelas
 * descontadas pela taxa do investimento. Se o à vista custa menos em valor
 * presente, ele vence; senão, parcelar e investir a diferença rende mais.
 * Sem I/O, sem efeitos colaterais.
 */
export class CashVsInstallmentService {
  static compute(input: CashVsInstallmentInput): CashVsInstallmentResult {
    const full = Number(input.fullPriceCents) / 100;
    const n = Math.max(1, Math.trunc(input.installments));
    const cash = full * (1 - input.discountPct / 100);
    const installmentValue = full / n;

    const i = Math.pow(1 + input.annualRatePct / 100, 1 / 12) - 1;
    let pv = 0;
    if (i === 0) {
      pv = full;
    } else {
      for (let k = 1; k <= n; k++) {
        pv += installmentValue / Math.pow(1 + i, k);
      }
    }

    const cashCents = reaisToCents(cash);
    const pvCents = reaisToCents(pv);

    let recommendation: CashVsInstallmentRecommendation = "empate";
    if (pvCents - cashCents > TOLERANCE_CENTS) recommendation = "avista";
    else if (cashCents - pvCents > TOLERANCE_CENTS) recommendation = "parcelar";

    const advantageCents = pvCents > cashCents ? pvCents - cashCents : cashCents - pvCents;

    return {
      cashPriceCents: cashCents,
      installmentValueCents: reaisToCents(installmentValue),
      presentValueInstallmentCents: pvCents,
      recommendation,
      advantageCents,
    };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais < 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
