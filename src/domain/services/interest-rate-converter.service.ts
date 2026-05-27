import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { isOk } from "@/shared/errors/result";

export type RateInputPeriod = "monthly" | "annual";

export interface InterestRateConverterInput {
  /** Valor da taxa em porcentagem (ex.: 1 = 1%). */
  ratePct: number;
  /** Período em que a taxa foi informada. */
  from: RateInputPeriod;
}

export type InterestRateConverterResult =
  | { ok: true; monthlyPct: number; annualPct: number }
  | { ok: false; message: string };

/**
 * Serviço puro: converte taxa de juros entre mensal e anual usando juros
 * compostos (1% a.m. = 12,68% a.a., não 12%). Reaproveita o VO InterestRate.
 * Sem I/O, sem efeitos colaterais.
 */
export class InterestRateConverterService {
  static convert(input: InterestRateConverterInput): InterestRateConverterResult {
    const decimal = input.ratePct / 100;
    const rate =
      input.from === "monthly" ? InterestRate.fromMonthly(decimal) : InterestRate.fromAnnual(decimal);
    if (!isOk(rate)) return { ok: false, message: "Taxa inválida." };

    return {
      ok: true,
      monthlyPct: rate.value.toMonthly().toPercent(),
      annualPct: rate.value.toAnnual().toPercent(),
    };
  }
}
