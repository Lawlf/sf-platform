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
