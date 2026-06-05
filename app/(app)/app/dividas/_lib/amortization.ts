import { CetCalculatorService } from "@/domain/services/cet-calculator.service";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

// Price installment formula: parcela = P × i / (1 − (1+i)^−n)
// Monthly rate derived from annual rate (compound):
//   i_monthly = (1 + annualPct/100)^(1/12) − 1
export function computePriceInstallmentCents(
  principalCents: bigint,
  annualRatePct: number,
  termMonths: number,
): bigint | null {
  if (principalCents <= 0n) return null;
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return null;
  if (!Number.isFinite(termMonths) || termMonths < 1) return null;
  const principal = Number(principalCents) / 100;
  const monthlyRate = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  let installmentReais: number;
  if (monthlyRate === 0) {
    installmentReais = principal / termMonths;
  } else {
    installmentReais = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
  }
  if (!Number.isFinite(installmentReais)) return null;
  return BigInt(Math.round(installmentReais * 100));
}

export function solveAnnualRatePct(
  principalCents: bigint,
  installmentCents: bigint,
  termMonths: number,
): number | null {
  if (principalCents <= 0n || installmentCents <= 0n) return null;
  if (!Number.isFinite(termMonths) || termMonths < 1) return null;

  const minInstallment = computePriceInstallmentCents(principalCents, 0, termMonths);
  if (minInstallment === null) return null;
  if (installmentCents < minInstallment) return null;

  let lo = 0;
  let hi = 1000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const inst = computePriceInstallmentCents(principalCents, mid, termMonths);
    if (inst === null) return null;
    if (inst < installmentCents) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 1e-6) break;
  }
  return (lo + hi) / 2;
}

export function computeCetAnnualText(
  netReceivedCents: bigint,
  principalCents: bigint,
  installmentCents: bigint,
  termMonths: number,
): string | null {
  if (principalCents <= 0n || netReceivedCents <= 0n || installmentCents <= 0n) return null;
  if (netReceivedCents >= principalCents) return null;
  const term = Math.floor(termMonths);
  if (!Number.isFinite(term) || term < 1) return null;
  const installments = Array.from({ length: term }, () => Money.fromCents(installmentCents));
  const r = CetCalculatorService.compute({
    principal: Money.fromCents(principalCents),
    installments,
    upfrontFees: Money.fromCents(principalCents - netReceivedCents),
  });
  if (!isOk(r)) return null;
  return r.value.toAnnual().format();
}
