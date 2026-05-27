export interface MarginFromPriceResult {
  /** Lucro por unidade = preço − custo (centavos). */
  profitCents: bigint;
  /** Margem = lucro ÷ preço (sempre < 100%). */
  marginPct: number;
  /** Markup = lucro ÷ custo (pode passar de 100%). */
  markupPct: number;
}

/**
 * Serviço puro: margem vs markup de um produto.
 *
 * A confusão clássica ("tenho 150% de margem"): margem é sobre o PREÇO e nunca
 * passa de 100%; markup é sobre o CUSTO e pode passar. Um markup de 150%
 * equivale a uma margem de 60%. Sem I/O, sem efeitos colaterais.
 */
export class MarginMarkupService {
  /** A partir de custo e preço, devolve lucro, margem e markup. */
  static fromCostPrice(input: { costCents: bigint; priceCents: bigint }): MarginFromPriceResult {
    const cost = Number(input.costCents) / 100;
    const price = Number(input.priceCents) / 100;
    const profit = price - cost;
    return {
      profitCents: input.priceCents - input.costCents,
      marginPct: price > 0 ? (profit / price) * 100 : 0,
      markupPct: cost > 0 ? (profit / cost) * 100 : 0,
    };
  }

  /** Preço de venda para uma margem desejada (margem < 100%). */
  static priceForMargin(input: { costCents: bigint; marginPct: number }): bigint {
    const cost = Number(input.costCents) / 100;
    const m = input.marginPct / 100;
    if (m >= 1) return 0n; // margem de 100%+ é impossível.
    return reaisToCents(cost / (1 - m));
  }

  /** Preço de venda para um markup desejado (sobre o custo). */
  static priceForMarkup(input: { costCents: bigint; markupPct: number }): bigint {
    const cost = Number(input.costCents) / 100;
    return reaisToCents(cost * (1 + input.markupPct / 100));
  }
}

function reaisToCents(reais: number): bigint {
  if (!Number.isFinite(reais) || reais < 0) return 0n;
  return BigInt(Math.round(reais * 100));
}
