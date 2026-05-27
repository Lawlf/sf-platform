export interface SavingsComparisonInput {
  /** Valor aplicado (centavos). */
  amountCents: bigint;
  /** Prazo da aplicação, em meses. */
  months: number;
  /** CDI ao ano, em % (referência ~ Selic). */
  cdiAnnualPct: number;
  /** Quanto do CDI o CDB rende (ex.: 100 = 100% do CDI). */
  cdbPctCdi: number;
}

export interface SavingsProductResult {
  /** Rendimento bruto no período (centavos). */
  grossYieldCents: bigint;
  /** Imposto de Renda sobre o rendimento (centavos). */
  taxCents: bigint;
  /** Rendimento líquido (centavos). */
  netYieldCents: bigint;
  /** Valor final = aplicado + líquido (centavos). */
  finalCents: bigint;
}

export type SavingsBest = "poupanca" | "cdb" | "tesouro";

export interface SavingsComparisonResult {
  poupanca: SavingsProductResult;
  cdb: SavingsProductResult;
  tesouro: SavingsProductResult;
  /** Qual rende mais líquido. */
  best: SavingsBest;
}

const POUPANCA_MONTHLY = 0.005; // 0,5% a.m. (regra com Selic > 8,5% a.a.), isenta de IR.
const CUSTODIA_ANUAL = 0.002; // 0,2% a.a. da B3 sobre o Tesouro.

/**
 * Serviço puro: compara onde o dinheiro rende mais entre Poupança, CDB e
 * Tesouro Selic, já líquido de Imposto de Renda (regressivo) e custódia.
 * Valores de referência; rendimentos reais variam com a instituição.
 * Sem I/O, sem efeitos colaterais.
 */
export class SavingsComparisonService {
  static compare(input: SavingsComparisonInput): SavingsComparisonResult {
    const amount = Number(input.amountCents) / 100;
    const months = Math.max(0, Math.trunc(input.months));
    const irRate = regressiveIrRate(months);

    // Poupança: 0,5% a.m. composto, isenta de IR.
    const poupGross = amount * (Math.pow(1 + POUPANCA_MONTHLY, months) - 1);
    const poupanca = build(amount, poupGross, 0);

    // CDB: % do CDI, IR regressivo sobre o rendimento.
    const cdbAnnual = (input.cdiAnnualPct / 100) * (input.cdbPctCdi / 100);
    const cdbGross = amount * (Math.pow(1 + cdbAnnual, months / 12) - 1);
    const cdb = build(amount, cdbGross, cdbGross * irRate);

    // Tesouro Selic: ~100% do CDI, IR regressivo + custódia 0,2% a.a.
    const tesAnnual = input.cdiAnnualPct / 100;
    const tesGross = amount * (Math.pow(1 + tesAnnual, months / 12) - 1);
    const custodia = amount * CUSTODIA_ANUAL * (months / 12);
    const tesouro = build(amount, tesGross, tesGross * irRate + custodia);

    const best = pickBest(poupanca, cdb, tesouro);
    return { poupanca, cdb, tesouro, best };
  }
}

/** IR regressivo por prazo (dias ~ meses x 30). */
function regressiveIrRate(months: number): number {
  const days = months * 30;
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

function build(amount: number, gross: number, tax: number): SavingsProductResult {
  const net = gross - tax;
  return {
    grossYieldCents: reaisToCents(gross),
    taxCents: reaisToCents(tax),
    netYieldCents: reaisToCents(net),
    finalCents: reaisToCents(amount + net),
  };
}

function pickBest(
  poupanca: SavingsProductResult,
  cdb: SavingsProductResult,
  tesouro: SavingsProductResult,
): SavingsBest {
  const entries: Array<{ key: SavingsBest; net: bigint }> = [
    { key: "poupanca", net: poupanca.netYieldCents },
    { key: "cdb", net: cdb.netYieldCents },
    { key: "tesouro", net: tesouro.netYieldCents },
  ];
  return entries.reduce((best, cur) => (cur.net > best.net ? cur : best)).key;
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais)) return 0n;
  return BigInt(Math.round(reais * 100));
}
