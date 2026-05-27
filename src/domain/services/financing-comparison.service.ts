import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { PriceAmortizationService } from "./amortization/price-amortization.service";
import { SacAmortizationService } from "./amortization/sac-amortization.service";

export interface FinancingComparisonInput {
  /** Valor financiado (centavos). */
  principalCents: bigint;
  /** Taxa de juros nominal ao ano (ex.: 12 = 12% a.a.). */
  annualRatePct: number;
  /** Prazo em meses. */
  termMonths: number;
}

export interface FinancingSystemResult {
  firstInstallmentCents: bigint;
  lastInstallmentCents: bigint;
  totalPaidCents: bigint;
  totalInterestCents: bigint;
}

export type FinancingComparisonResult =
  | {
      ok: true;
      price: FinancingSystemResult;
      sac: FinancingSystemResult;
      /** Quanto de juros o SAC economiza frente ao Price (centavos). */
      interestSavedBySacCents: bigint;
    }
  | { ok: false; message: string };

/**
 * Serviço puro que compara Tabela Price e SAC para o mesmo financiamento,
 * reaproveitando os engines de amortização do domínio. Devolve só primitivos
 * (centavos) para ser consumido direto por UI ou pelo fluxo de nova dívida.
 *
 * Price: parcela fixa do início ao fim. SAC: amortização constante, parcela
 * decrescente e menos juros no total. Sem I/O, sem efeitos colaterais.
 */
export class FinancingComparisonService {
  static compare(input: FinancingComparisonInput): FinancingComparisonResult {
    const rate = InterestRate.fromAnnual(input.annualRatePct / 100);
    if (!isOk(rate)) return { ok: false, message: "Taxa de juros inválida." };

    const principal = Money.fromCents(input.principalCents);
    const params = { principal, annualRate: rate.value, termMonths: input.termMonths };

    const price = PriceAmortizationService.generate(params);
    if (!isOk(price)) return { ok: false, message: price.error.message };

    const sac = SacAmortizationService.generate(params);
    if (!isOk(sac)) return { ok: false, message: sac.error.message };

    const priceResult = extract(price.value);
    const sacResult = extract(sac.value);

    return {
      ok: true,
      price: priceResult,
      sac: sacResult,
      interestSavedBySacCents: priceResult.totalInterestCents - sacResult.totalInterestCents,
    };
  }
}

function extract(schedule: AmortizationSchedule): FinancingSystemResult {
  const term = schedule.termMonths();
  const first = schedule.installmentAt(1);
  const last = schedule.installmentAt(term);
  return {
    firstInstallmentCents: first ? first.installment.toCents() : 0n,
    lastInstallmentCents: last ? last.installment.toCents() : 0n,
    totalPaidCents: schedule.totalPaid().toCents(),
    totalInterestCents: schedule.totalInterest().toCents(),
  };
}
