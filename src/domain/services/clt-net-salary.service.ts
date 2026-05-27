import { computeInss, resolveIrrf } from "./brazil-payroll-tax";

export interface CltNetSalaryInput {
  /** Salário bruto mensal (centavos). */
  grossCents: bigint;
  /** Número de dependentes para o IRRF. */
  dependents: number;
  /** Outros descontos que não afetam o imposto (VT, plano, etc) (centavos). */
  otherDeductionsCents: bigint;
}

export interface CltNetSalaryResult {
  /** Contribuição ao INSS (centavos). */
  inssCents: bigint;
  /** Base de cálculo do IRRF (centavos). */
  irrfBaseCents: bigint;
  /** Imposto de renda retido (centavos). */
  irrfCents: bigint;
  /** Alíquota da faixa de IRRF aplicada (ex.: 7.5, 15, 22.5, 27.5; 0 se isento). */
  irrfBandPct: number;
  /** true quando o desconto simplificado foi mais vantajoso que as deduções legais. */
  usedSimplifiedDeduction: boolean;
  /** Salário líquido final (centavos). */
  netCents: bigint;
}

/**
 * Serviço puro: salário líquido CLT mensal. Desconta INSS e IRRF do bruto,
 * mais descontos que não afetam o imposto (VT, plano). Reaproveita o módulo
 * `brazil-payroll-tax`. Sem I/O, sem efeitos colaterais.
 */
export class CltNetSalaryService {
  static compute(input: CltNetSalaryInput): CltNetSalaryResult {
    const gross = Number(input.grossCents) / 100;
    const inss = computeInss(gross);
    const irrf = resolveIrrf(gross, inss, input.dependents);
    const other = Number(input.otherDeductionsCents) / 100;
    const net = gross - inss - irrf.tax - other;

    return {
      inssCents: reaisToCents(inss),
      irrfBaseCents: reaisToCents(irrf.base),
      irrfCents: reaisToCents(irrf.tax),
      irrfBandPct: irrf.bandPct,
      usedSimplifiedDeduction: irrf.usedSimplified,
      netCents: reaisToCents(net),
    };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais)) return 0n;
  return BigInt(Math.round(reais * 100));
}
