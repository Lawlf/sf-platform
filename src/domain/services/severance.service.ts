import { computeInss, resolveIrrf } from "./brazil-payroll-tax";

export interface SeveranceInput {
  /** Salário bruto mensal (centavos). */
  grossSalaryCents: bigint;
  /** Anos completos na empresa (para aviso prévio e estimativa de FGTS). */
  completedYears: number;
  /** Meses trabalhados no ano corrente (avos de 13º e férias, 1 a 12). */
  monthsThisYear: number;
  /** Dias trabalhados no mês da saída (saldo de salário, 0 a 30). */
  daysWorkedInMonth: number;
  /** Saldo de FGTS informado; 0 = estima por 8% x salário x meses. */
  fgtsBalanceCents: bigint;
  /** Dependentes para o IRRF. */
  dependents: number;
}

export interface SeveranceResult {
  saldoSalarioCents: bigint;
  avisoPrevioCents: bigint;
  decimoTerceiroCents: bigint;
  feriasCents: bigint;
  /** INSS sobre saldo de salário + 13º (verbas tributáveis). */
  inssCents: bigint;
  /** IRRF sobre saldo de salário + 13º. */
  irrfCents: bigint;
  /** Verbas brutas menos INSS e IR. */
  verbasLiquidasCents: bigint;
  /** Saldo de FGTS (sacável). */
  fgtsBalanceCents: bigint;
  /** Multa de 40% sobre o FGTS. */
  fgtsFineCents: bigint;
  /** Verbas líquidas + multa 40% (o que cai da empresa). */
  totalCents: bigint;
  /** Total incluindo o saque do FGTS. */
  totalWithFgtsCents: bigint;
}

/**
 * Serviço puro: rescisão por demissão SEM justa causa (estimativa).
 *
 * Tributação: saldo de salário e 13º proporcional pagam INSS e IRRF (o 13º é
 * tributado em separado). Aviso prévio indenizado e férias indenizadas (+1/3)
 * são isentos. FGTS e a multa de 40% também são isentos. Reaproveita o módulo
 * `brazil-payroll-tax`. Sem I/O, sem efeitos colaterais.
 */
export class SeveranceService {
  static compute(input: SeveranceInput): SeveranceResult {
    const salary = Number(input.grossSalaryCents) / 100;
    const years = Math.max(0, Math.trunc(input.completedYears));
    const avos = Math.min(12, Math.max(0, Math.trunc(input.monthsThisYear)));
    const daysInMonth = Math.min(30, Math.max(0, Math.trunc(input.daysWorkedInMonth)));

    const saldoSalario = (salary / 30) * daysInMonth;
    const avisoDays = Math.min(90, 30 + 3 * years); // 30 dias + 3 por ano, teto 90.
    const avisoPrevio = (salary / 30) * avisoDays;
    const decimoTerceiro = (salary / 12) * avos;
    const ferias = (salary / 12) * avos * (4 / 3); // proporcional + 1/3.

    // Tributáveis: saldo de salário e 13º (este, separadamente).
    const inssSaldo = computeInss(saldoSalario);
    const irSaldo = resolveIrrf(saldoSalario, inssSaldo, input.dependents).tax;
    const inss13 = computeInss(decimoTerceiro);
    const ir13 = resolveIrrf(decimoTerceiro, inss13, input.dependents).tax;

    const totalInss = inssSaldo + inss13;
    const totalIr = irSaldo + ir13;

    const verbasBrutas = saldoSalario + avisoPrevio + decimoTerceiro + ferias;
    const verbasLiquidas = verbasBrutas - totalInss - totalIr;

    const totalMonths = years * 12 + avos;
    const fgtsBalance =
      input.fgtsBalanceCents > 0n
        ? Number(input.fgtsBalanceCents) / 100
        : 0.08 * salary * totalMonths;
    const fgtsFine = fgtsBalance * 0.4;

    const total = verbasLiquidas + fgtsFine;

    return {
      saldoSalarioCents: reaisToCents(saldoSalario),
      avisoPrevioCents: reaisToCents(avisoPrevio),
      decimoTerceiroCents: reaisToCents(decimoTerceiro),
      feriasCents: reaisToCents(ferias),
      inssCents: reaisToCents(totalInss),
      irrfCents: reaisToCents(totalIr),
      verbasLiquidasCents: reaisToCents(verbasLiquidas),
      fgtsBalanceCents: reaisToCents(fgtsBalance),
      fgtsFineCents: reaisToCents(fgtsFine),
      totalCents: reaisToCents(total),
      totalWithFgtsCents: reaisToCents(total + fgtsBalance),
    };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais < 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
