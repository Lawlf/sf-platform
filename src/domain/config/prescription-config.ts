/**
 * Tunáveis da prescrição (Alavanca 1). NÃO espalhar esses números pelo código.
 * Valores iniciais (validar com produto, ver spec §4.6).
 */
export interface PrescriptionConfig {
  /** Taxa mensal (decimal) acima da qual a dívida é "cara". 0.04 = 4% a.m. ≈ 60% a.a. */
  expensiveDebtMonthlyRate: number;
  /** Meses de gastos essenciais que definem o colchão-alvo. */
  reserveFloorMonths: number;
  /** Colchão mínimo absoluto antes de acelerar quitação. */
  minSafetyMonths: number;
  /** Renda comprometida (%) a partir da qual o estado é "apertado". */
  committedHeavyPct: number;
  /** Retorno anual (decimal) usado na projeção simples de aporte. */
  investAnnualRate: number;
  /** Teto de meses para o projetor de payoff. */
  maxPayoffMonths: number;
}

export const PRESCRIPTION_CONFIG: PrescriptionConfig = {
  expensiveDebtMonthlyRate: 0.04,
  reserveFloorMonths: 3,
  minSafetyMonths: 1,
  committedHeavyPct: 50,
  investAnnualRate: 0.1,
  maxPayoffMonths: 600,
};
