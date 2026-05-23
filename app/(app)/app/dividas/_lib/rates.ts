import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { isOk, type Result } from "@/shared/errors";

// Converte percentual anual (ex: 12 = 12% a.a.) em InterestRate ou null em caso de erro.
export function parseAnnualRatePct(pct: number): InterestRate | null {
  const r = InterestRate.fromAnnual(pct / 100);
  return isOk(r) ? r.value : null;
}

export function parseMonthlyRatePct(pct: number): InterestRate | null {
  const r = InterestRate.fromMonthly(pct / 100);
  return isOk(r) ? r.value : null;
}

// Como acima mas devolve Result (caso o caller precise distinguir entre erros).
export function parseAnnualRatePctResult(pct: number): Result<InterestRate, Error> {
  return InterestRate.fromAnnual(pct / 100);
}

export function parseMonthlyRatePctResult(pct: number): Result<InterestRate, Error> {
  return InterestRate.fromMonthly(pct / 100);
}
