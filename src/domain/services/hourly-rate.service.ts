export interface HourlyRateInput {
  /** Renda líquida mensal (centavos). */
  netMonthlyCents: bigint;
  /** Horas trabalhadas por semana. */
  hoursPerWeek: number;
}

export interface HourlyRateResult {
  /** Valor de uma hora do seu trabalho (centavos). */
  hourlyCents: bigint;
  /** Valor de um dia útil (renda ÷ 22 dias) (centavos). */
  perWorkdayCents: bigint;
  /** Horas trabalhadas no mês (semanas convertidas: 52/12). */
  monthlyHours: number;
}

const WEEKS_PER_MONTH = 52 / 12;
const WORKDAYS_PER_MONTH = 22;

/**
 * Serviço puro: quanto vale a sua hora. Converte renda mensal e jornada
 * semanal em valor por hora (e por dia útil). Métrica macro pra decidir se um
 * trabalho extra, um freela ou um corte de horas compensa. Sem I/O, sem efeitos.
 */
export class HourlyRateService {
  static compute(input: HourlyRateInput): HourlyRateResult {
    const net = Number(input.netMonthlyCents) / 100;
    const hoursWeek = Math.max(0, input.hoursPerWeek);
    const monthlyHours = hoursWeek * WEEKS_PER_MONTH;

    const hourly = monthlyHours > 0 ? net / monthlyHours : 0;
    const perWorkday = net / WORKDAYS_PER_MONTH;

    return {
      hourlyCents: reaisToCents(hourly),
      perWorkdayCents: reaisToCents(perWorkday),
      monthlyHours,
    };
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais < 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
