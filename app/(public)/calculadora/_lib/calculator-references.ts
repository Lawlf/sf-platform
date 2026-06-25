/**
 * Referência de cada calculadora: qual tabela/lei ela segue e quando os valores
 * foram atualizados. Alimenta a linha pública "tabela de referência · atualização"
 * para o usuário saber se o número está em dia com a legislação brasileira.
 *
 * MANUTENÇÃO: revisar em janeiro (reajuste de salário mínimo, INSS e tabela do
 * IRRF) e sempre que sair lei/MP nova. As calculadoras de fórmula matemática
 * (`legal: false`) não dependem de tabela e não saem da validade. Chave = id do
 * simulador interno (`SIMULATORS` / `PublicCalculator.simId`).
 *
 * Última auditoria completa: junho de 2026 (ver docs/auditoria-calculadoras-2026-06-25.md).
 */
export interface CalculatorReference {
  /** Tabela/lei de base, em PT-BR curto. */
  table: string;
  /** Ano de referência dos valores (ex.: "2026"); null para fórmula fixa. */
  year: string | null;
  /** Quando os valores foram atualizados pela última vez (ex.: "janeiro de 2026"). */
  updated: string;
  /** true quando depende de tabela/lei que muda com reajuste anual ou nova norma. */
  legal: boolean;
}

const FORMULA: Omit<CalculatorReference, "table"> = {
  year: null,
  updated: "fórmula fixa",
  legal: false,
};

export const CALCULATOR_REFERENCES: Record<string, CalculatorReference> = {
  "salario-clt": {
    table: "INSS e IRRF (Lei 15.270/2025)",
    year: "2026",
    updated: "janeiro de 2026",
    legal: true,
  },
  "decimo-terceiro": {
    table: "INSS e IRRF (Lei 15.270/2025)",
    year: "2026",
    updated: "janeiro de 2026",
    legal: true,
  },
  ferias: {
    table: "INSS e IRRF (Lei 15.270/2025) e 1/3 constitucional",
    year: "2026",
    updated: "janeiro de 2026",
    legal: true,
  },
  rescisao: {
    table: "INSS e IRRF (Lei 15.270/2025), FGTS 8% e multa de 40%",
    year: "2026",
    updated: "janeiro de 2026",
    legal: true,
  },
  "clt-vs-pj": {
    table: "INSS e IRRF (Lei 15.270/2025) e MEI/Simples Nacional",
    year: "2026",
    updated: "janeiro de 2026",
    legal: true,
  },
  "onde-rende-mais": {
    table: "IR regressivo de renda fixa (Lei 11.033/2004) e custódia da B3",
    year: "2026",
    updated: "janeiro de 2026",
    legal: true,
  },
  "juros-compostos": { table: "Fórmula de juros compostos", ...FORMULA },
  independencia: { table: "Regra dos 4% (taxa segura de retirada)", ...FORMULA },
  "meta-investimento": { table: "Fórmula de aporte para meta", ...FORMULA },
  reserva: { table: "Fórmula de reserva de emergência", ...FORMULA },
  financiamento: { table: "Amortização Price e SAC", ...FORMULA },
  "divida-vs-investir": { table: "Fórmula de juros compostos", ...FORMULA },
  rotativo: { table: "Fórmula de juros compostos", ...FORMULA },
  quitacao: { table: "Fórmula de amortização de dívida", ...FORMULA },
  extra: { table: "Fórmula de amortização de dívida", ...FORMULA },
  estrategia: { table: "Fórmula de quitação (avalanche e bola de neve)", ...FORMULA },
  "valor-hora": { table: "Fórmula de valor da hora", ...FORMULA },
  "margem-markup": { table: "Fórmula de margem e markup", ...FORMULA },
  ebitda: { table: "Fórmula de EBITDA", ...FORMULA },
  compra: { table: "Fórmula de custo de oportunidade", ...FORMULA },
  "avista-parcelado": { table: "Valor presente das parcelas", ...FORMULA },
  "conversor-juros": { table: "Conversão de taxa equivalente", ...FORMULA },
  "regra-de-tres": { table: "Proporção (regra de três)", ...FORMULA },
};

export function getCalculatorReference(simId: string): CalculatorReference | undefined {
  return CALCULATOR_REFERENCES[simId];
}
