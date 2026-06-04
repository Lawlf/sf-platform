import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { PriceAmortizationService } from "./amortization/price-amortization.service";
import { SacAmortizationService } from "./amortization/sac-amortization.service";

export type FinancingMethod = "price" | "sac";

export interface FinancingInput {
  loanAmountCents: bigint;
  annualRatePct: number;
  months: number;
  method: FinancingMethod;
}

export type FinancingResult =
  | {
      ok: true;
      method: FinancingMethod;
      firstInstallmentCents: bigint;
      lastInstallmentCents: bigint;
      totalInterestCents: bigint;
      totalPaidCents: bigint;
    }
  | { ok: false; message: string };

/**
 * Serviço puro que simula um financiamento por Tabela Price ou SAC,
 * reaproveitando os engines de amortização do domínio. Devolve só primitivos
 * (centavos). Sem I/O, sem auth, sem Date.
 */
export class FinancingService {
  static simulate(input: FinancingInput): FinancingResult {
    const rate = InterestRate.fromAnnual(input.annualRatePct / 100);
    if (!isOk(rate)) return { ok: false, message: "Taxa de juros inválida." };

    const principal = Money.fromCents(input.loanAmountCents);
    const params = { principal, annualRate: rate.value, termMonths: input.months };

    const schedule =
      input.method === "sac"
        ? SacAmortizationService.generate(params)
        : PriceAmortizationService.generate(params);
    if (!isOk(schedule)) return { ok: false, message: schedule.error.message };

    return { ok: true, method: input.method, ...extract(schedule.value) };
  }
}

function extract(schedule: AmortizationSchedule): {
  firstInstallmentCents: bigint;
  lastInstallmentCents: bigint;
  totalInterestCents: bigint;
  totalPaidCents: bigint;
} {
  const term = schedule.termMonths();
  const first = schedule.installmentAt(1);
  const last = schedule.installmentAt(term);
  return {
    firstInstallmentCents: first ? first.installment.toCents() : 0n,
    lastInstallmentCents: last ? last.installment.toCents() : 0n,
    totalInterestCents: schedule.totalInterest().toCents(),
    totalPaidCents: schedule.totalPaid().toCents(),
  };
}
