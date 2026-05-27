import { computeInss, resolveIrrf } from "./brazil-payroll-tax";

export interface ThirteenthSalaryInput {
  /** Salário bruto mensal (centavos). */
  grossSalaryCents: bigint;
  /** Meses trabalhados no ano (1 a 12); o 13º é proporcional. */
  monthsWorked: number;
  /** Dependentes para o IRRF. */
  dependents: number;
}

export interface ThirteenthSalaryResult {
  gross13Cents: bigint;
  inssCents: bigint;
  irrfBaseCents: bigint;
  irrfCents: bigint;
  irrfBandPct: number;
  usedSimplifiedDeduction: boolean;
  netCents: bigint;
  /** 1ª parcela (até nov): metade do bruto, sem descontos. */
  firstInstallmentCents: bigint;
  /** 2ª parcela (até dez): líquido total menos a 1ª parcela. */
  secondInstallmentCents: bigint;
}

/**
 * Serviço puro: 13º salário líquido. O 13º é tributado SEPARADAMENTE do
 * salário do mês (INSS e IRSeparados, em parcela única). A 1ª parcela sai sem
 * descontos; a 2ª absorve INSS e IRRF do 13º inteiro. Reaproveita o módulo
 * `brazil-payroll-tax`. Sem I/O, sem efeitos colaterais.
 */
export class ThirteenthSalaryService {
  static compute(input: ThirteenthSalaryInput): ThirteenthSalaryResult {
    const salary = Number(input.grossSalaryCents) / 100;
    const months = Math.min(12, Math.max(0, Math.trunc(input.monthsWorked)));
    const gross13 = (salary * months) / 12;

    const inss = computeInss(gross13);
    const irrf = resolveIrrf(gross13, inss, input.dependents);
    const net = gross13 - inss - irrf.tax;

    const gross13Cents = reaisToCents(gross13);
    const netCents = reaisToCents(net);
    const firstInstallmentCents = reaisToCents(gross13 / 2);

    return {
      gross13Cents,
      inssCents: reaisToCents(inss),
      irrfBaseCents: reaisToCents(irrf.base),
      irrfCents: reaisToCents(irrf.tax),
      irrfBandPct: irrf.bandPct,
      usedSimplifiedDeduction: irrf.usedSimplified,
      netCents,
      firstInstallmentCents,
      secondInstallmentCents: netCents - firstInstallmentCents,
    };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais)) return 0n;
  return BigInt(Math.round(reais * 100));
}
