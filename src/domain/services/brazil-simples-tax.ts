/**
 * Tributação de empresa no Simples Nacional e MEI (referência 2026), usada
 * pelo simulador CLT x PJ. Valores datados e fáceis de atualizar. As faixas
 * dos Anexos III e V são da LC 123 e não mudam com reajuste anual; o que muda
 * em janeiro é o DAS-MEI (5% do salário mínimo) e o teto do INSS.
 */

export type MeiActivity = "comercio" | "servicos" | "ambos";
export type SimplesAnexo = "III" | "V";

// DAS-MEI 2026: 5% do salário mínimo (R$ 1.621 = R$ 81,05) + ICMS/ISS.
export const MEI_DAS_2026: Record<MeiActivity, number> = {
  comercio: 82.05, // 81,05 + 1,00 ICMS
  servicos: 86.05, // 81,05 + 5,00 ISS
  ambos: 87.05, // 81,05 + 1,00 + 5,00
};

export const MEI_ANNUAL_LIMIT = 81000;

interface SimplesBracket {
  upTo: number; // teto da RBT12 (receita bruta 12 meses)
  nominal: number; // alíquota nominal
  deduct: number; // parcela a deduzir
}

// Anexo III (serviços com Fator R >= 28%).
const ANEXO_III: SimplesBracket[] = [
  { upTo: 180000, nominal: 0.06, deduct: 0 },
  { upTo: 360000, nominal: 0.112, deduct: 9360 },
  { upTo: 720000, nominal: 0.135, deduct: 17640 },
  { upTo: 1800000, nominal: 0.16, deduct: 35640 },
  { upTo: 3600000, nominal: 0.21, deduct: 125640 },
  { upTo: 4800000, nominal: 0.33, deduct: 648000 },
];

// Anexo V (serviços intelectuais com Fator R < 28%).
const ANEXO_V: SimplesBracket[] = [
  { upTo: 180000, nominal: 0.155, deduct: 0 },
  { upTo: 360000, nominal: 0.18, deduct: 4500 },
  { upTo: 720000, nominal: 0.195, deduct: 9900 },
  { upTo: 1800000, nominal: 0.205, deduct: 17100 },
  { upTo: 3600000, nominal: 0.23, deduct: 62100 },
  { upTo: 4800000, nominal: 0.305, deduct: 540000 },
];

/**
 * Alíquota efetiva do Simples: (RBT12 x nominal - parcela a deduzir) / RBT12.
 * Na 1ª faixa a efetiva é a própria nominal. RBT12 = receita bruta dos 12 meses
 * (aqui estimada como faturamento mensal x 12, regime estável).
 */
export function simplesEffectiveRate(rbt12: number, anexo: SimplesAnexo): number {
  if (rbt12 <= 0) return 0;
  const brackets = anexo === "III" ? ANEXO_III : ANEXO_V;
  const bracket = brackets.find((b) => rbt12 <= b.upTo) ?? brackets[brackets.length - 1]!;
  const effective = (rbt12 * bracket.nominal - bracket.deduct) / rbt12;
  return Math.max(0, effective);
}

/**
 * Fator R = folha de 12 meses (pró-labore incluso) / receita bruta de 12 meses.
 * Fator R >= 28% enquadra no Anexo III (mais barato); senão, Anexo V.
 */
export function resolveAnexoByFatorR(proLaboreMonthly: number, revenueMonthly: number): {
  fatorR: number;
  anexo: SimplesAnexo;
} {
  const fatorR = revenueMonthly > 0 ? proLaboreMonthly / revenueMonthly : 0;
  return { fatorR, anexo: fatorR >= 0.28 ? "III" : "V" };
}

const INSS_RATE_PRO_LABORE = 0.11;
const INSS_CEILING_2026 = 8475.55;

/** INSS sobre o pró-labore: 11% limitado ao teto (R$ 932,31 em 2026). */
export function proLaboreInss(proLaboreMonthly: number): number {
  const base = Math.min(Math.max(0, proLaboreMonthly), INSS_CEILING_2026);
  return base * INSS_RATE_PRO_LABORE;
}
