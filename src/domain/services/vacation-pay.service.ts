import { computeInss, resolveIrrf } from "./brazil-payroll-tax";

export interface VacationPayInput {
  /** Salário bruto mensal (centavos). */
  grossSalaryCents: bigint;
  /** Dias de férias (1 a 30). */
  vacationDays: number;
  /** Dependentes para o IRRF. */
  dependents: number;
}

export interface VacationPayResult {
  /** Salário proporcional aos dias de férias (centavos). */
  vacationBaseCents: bigint;
  /** Terço constitucional (1/3 sobre o valor das férias) (centavos). */
  oneThirdCents: bigint;
  /** Bruto das férias = base + terço (centavos). */
  grossCents: bigint;
  inssCents: bigint;
  irrfBaseCents: bigint;
  irrfCents: bigint;
  irrfBandPct: number;
  usedSimplifiedDeduction: boolean;
  netCents: bigint;
}

/**
 * Serviço puro: férias líquidas. Soma o salário proporcional aos dias com o
 * terço constitucional (1/3), e desconta INSS e IRRF sobre o total. Muitos
 * sites esquecem o terço; aqui ele entra certo. Reaproveita `brazil-payroll-tax`.
 * Sem I/O, sem efeitos colaterais.
 */
export class VacationPayService {
  static compute(input: VacationPayInput): VacationPayResult {
    const salary = Number(input.grossSalaryCents) / 100;
    const days = Math.min(30, Math.max(0, Math.trunc(input.vacationDays)));
    const vacationBase = (salary * days) / 30;
    const oneThird = vacationBase / 3;
    const gross = vacationBase + oneThird;

    const inss = computeInss(gross);
    const irrf = resolveIrrf(gross, inss, input.dependents);
    const net = gross - inss - irrf.tax;

    return {
      vacationBaseCents: reaisToCents(vacationBase),
      oneThirdCents: reaisToCents(oneThird),
      grossCents: reaisToCents(gross),
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
