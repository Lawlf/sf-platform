export interface EmergencyFundInput {
  /** Custo de vida fixo mensal a proteger (centavos). */
  monthlyCostCents: bigint;
  /** Reserva líquida que você já tem hoje (centavos). */
  currentReserveCents: bigint;
  /** Meta de cobertura, em meses de custo fixo. */
  targetMonths: number;
  /** Aporte mensal destinado a completar a reserva (centavos). */
  monthlyContributionCents: bigint;
}

export type EmergencyFundStatus = "zerada" | "parcial" | "ok";

export interface EmergencyFundResult {
  /** Reserva-alvo = custo mensal x meses de meta (centavos). */
  targetCents: bigint;
  /** Quantos meses de custo fixo a reserva atual cobre (fracionário). */
  monthsCovered: number;
  /** Quanto falta para atingir a meta (centavos, nunca negativo). */
  gapCents: bigint;
  /** Meses para completar a reserva com o aporte; null se há gap mas sem aporte. */
  monthsToComplete: number | null;
  status: EmergencyFundStatus;
}

/**
 * Serviço puro: dimensiona a reserva de emergência em meses de custo fixo.
 *
 * A reserva fica em aplicação líquida e conservadora, então o modelo ignora
 * rendimento de propósito (visão conservadora): o que importa é quantos meses
 * de custo ela cobre hoje e quanto falta para a meta. Sem I/O, sem efeitos.
 */
export class EmergencyFundService {
  static simulate(input: EmergencyFundInput): EmergencyFundResult {
    const monthlyCost = Number(input.monthlyCostCents) / 100;
    const targetCents = input.monthlyCostCents * BigInt(Math.max(0, Math.trunc(input.targetMonths)));

    const monthsCovered =
      monthlyCost > 0 ? Number(input.currentReserveCents) / Number(input.monthlyCostCents) : 0;

    const gapCents =
      input.currentReserveCents >= targetCents ? 0n : targetCents - input.currentReserveCents;

    let status: EmergencyFundStatus;
    if (input.currentReserveCents <= 0n) status = "zerada";
    else if (input.currentReserveCents >= targetCents) status = "ok";
    else status = "parcial";

    let monthsToComplete: number | null;
    if (gapCents === 0n) {
      monthsToComplete = 0;
    } else if (input.monthlyContributionCents > 0n) {
      monthsToComplete = Math.ceil(Number(gapCents) / Number(input.monthlyContributionCents));
    } else {
      monthsToComplete = null;
    }

    return { targetCents, monthsCovered, gapCents, monthsToComplete, status };
  }
}
