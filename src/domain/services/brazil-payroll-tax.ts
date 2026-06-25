/**
 * Tabelas e funções de imposto sobre a folha (CLT) no Brasil, reaproveitadas
 * pelos simuladores de salário líquido, 13º e férias. Valores de referência
 * 2026, em reais, fáceis de atualizar (reajuste costuma ser em janeiro/maio).
 *
 * O cálculo é feito do jeito CERTO: INSS progressivo por faixa (cada alíquota
 * só na parte do salário dentro da faixa) e IRRF escolhendo entre o desconto
 * simplificado e as deduções legais, o que pagar menos imposto. Sobre o imposto
 * apurado ainda incide o redutor da Lei 15.270/2025 (vigente jan/2026), que
 * zera o IRRF para rendimentos mensais até R$ 5.000 e decresce até R$ 7.350.
 */
export const INSS_BRACKETS_2026: ReadonlyArray<{ upTo: number; rate: number }> = [
  { upTo: 1621.0, rate: 0.075 },
  { upTo: 2902.84, rate: 0.09 },
  { upTo: 4354.27, rate: 0.12 },
  { upTo: 8475.55, rate: 0.14 },
];

export const IRRF_BRACKETS_2026: ReadonlyArray<{ upTo: number; rate: number; deduct: number }> = [
  { upTo: 2428.8, rate: 0, deduct: 0 },
  { upTo: 2826.65, rate: 0.075, deduct: 182.16 },
  { upTo: 3751.05, rate: 0.15, deduct: 394.16 },
  { upTo: 4664.68, rate: 0.225, deduct: 675.49 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.275, deduct: 908.73 },
];

export const DEPENDENT_DEDUCTION = 189.59;
export const SIMPLIFIED_DEDUCTION = 607.2; // 25% da faixa de isenção (2428,80).

const REDUCTION_INCOME_CEILING = 7350.0;
const REDUCTION_INTERCEPT = 978.62;
const REDUCTION_SLOPE = 0.133145;

/**
 * Redutor mensal do IRRF (Lei 15.270/2025). Incide sobre o RENDIMENTO bruto
 * mensal, não sobre a base de cálculo, e é abatido do imposto apurado (nunca
 * vira crédito). Até R$ 5.000 cobre todo o imposto; some em R$ 7.350.
 */
function monthlyIrrfReduction(grossReais: number): number {
  if (grossReais > REDUCTION_INCOME_CEILING) return 0;
  return Math.max(0, REDUCTION_INTERCEPT - REDUCTION_SLOPE * grossReais);
}

/** INSS progressivo por faixa, com teto. Entrada e saída em reais. */
export function computeInss(grossReais: number): number {
  if (grossReais <= 0) return 0;
  let inss = 0;
  let prev = 0;
  for (const bracket of INSS_BRACKETS_2026) {
    const taxable = Math.min(grossReais, bracket.upTo) - prev;
    if (taxable > 0) inss += taxable * bracket.rate;
    prev = bracket.upTo;
    if (grossReais <= bracket.upTo) break;
  }
  return inss;
}

/** IRRF de tabela sobre uma base já calculada, sem o redutor. */
export function computeIrrf(baseReais: number): { tax: number; bandPct: number } {
  for (const bracket of IRRF_BRACKETS_2026) {
    if (baseReais <= bracket.upTo) {
      const tax = Math.max(0, baseReais * bracket.rate - bracket.deduct);
      return { tax, bandPct: Math.round(bracket.rate * 1000) / 10 };
    }
  }
  return { tax: 0, bandPct: 0 };
}

/**
 * Resolve o IRRF escolhendo a dedução mais vantajosa (simplificada vs legal)
 * e aplicando o redutor mensal. Recebe o bruto, o INSS já calculado e o número
 * de dependentes (reais). bandPct vira 0 quando o redutor zera o imposto.
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
  const { tax: tableTax, bandPct: tableBand } = computeIrrf(base);
  const tax = Math.max(0, tableTax - monthlyIrrfReduction(grossReais));
  return { base, tax, bandPct: tax > 0 ? tableBand : 0, usedSimplified };
}
