/**
 * Tabelas e funções de imposto sobre a folha (CLT) no Brasil, reaproveitadas
 * pelos simuladores de salário líquido, 13º e férias. Valores de referência
 * 2025, em reais, fáceis de atualizar (reajuste costuma ser em janeiro/maio).
 *
 * O cálculo é feito do jeito CERTO: INSS progressivo por faixa (cada alíquota
 * só na parte do salário dentro da faixa) e IRRF escolhendo entre o desconto
 * simplificado e as deduções legais, o que pagar menos imposto.
 */
export const INSS_BRACKETS_2025: ReadonlyArray<{ upTo: number; rate: number }> = [
  { upTo: 1518.0, rate: 0.075 },
  { upTo: 2793.88, rate: 0.09 },
  { upTo: 4190.83, rate: 0.12 },
  { upTo: 8157.41, rate: 0.14 },
];

export const IRRF_BRACKETS_2025: ReadonlyArray<{ upTo: number; rate: number; deduct: number }> = [
  { upTo: 2259.2, rate: 0, deduct: 0 },
  { upTo: 2826.65, rate: 0.075, deduct: 169.44 },
  { upTo: 3751.05, rate: 0.15, deduct: 381.44 },
  { upTo: 4664.68, rate: 0.225, deduct: 662.77 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.275, deduct: 896.0 },
];

export const DEPENDENT_DEDUCTION = 189.59;
export const SIMPLIFIED_DEDUCTION = 564.8; // 25% da faixa de isenção.

/** INSS progressivo por faixa, com teto. Entrada e saída em reais. */
export function computeInss(grossReais: number): number {
  if (grossReais <= 0) return 0;
  let inss = 0;
  let prev = 0;
  for (const bracket of INSS_BRACKETS_2025) {
    const taxable = Math.min(grossReais, bracket.upTo) - prev;
    if (taxable > 0) inss += taxable * bracket.rate;
    prev = bracket.upTo;
    if (grossReais <= bracket.upTo) break;
  }
  return inss;
}

/** IRRF sobre uma base já calculada. Retorna imposto e a alíquota da faixa. */
export function computeIrrf(baseReais: number): { tax: number; bandPct: number } {
  for (const bracket of IRRF_BRACKETS_2025) {
    if (baseReais <= bracket.upTo) {
      const tax = Math.max(0, baseReais * bracket.rate - bracket.deduct);
      return { tax, bandPct: Math.round(bracket.rate * 1000) / 10 };
    }
  }
  return { tax: 0, bandPct: 0 };
}

/**
 * Resolve o IRRF escolhendo a dedução mais vantajosa (simplificada vs legal).
 * Recebe o bruto, o INSS já calculado e o número de dependentes (reais).
 */
export function resolveIrrf(
  grossReais: number,
  inssReais: number,
  dependents: number,
): { base: number; tax: number; bandPct: number; usedSimplified: boolean } {
  const deps = Math.max(0, Math.trunc(dependents));
  const legalDeduction = inssReais + deps * DEPENDENT_DEDUCTION;
  const usedSimplified = SIMPLIFIED_DEDUCTION > legalDeduction;
  const deduction = usedSimplified ? SIMPLIFIED_DEDUCTION : legalDeduction;
  const base = Math.max(0, grossReais - deduction);
  const { tax, bandPct } = computeIrrf(base);
  return { base, tax, bandPct, usedSimplified };
}
