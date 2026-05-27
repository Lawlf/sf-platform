export interface EbitdaInput {
  /** Receita (faturamento) do período (centavos). */
  revenueCents: bigint;
  /** Custos diretos: produtos, insumos, matéria-prima (centavos). */
  cogsCents: bigint;
  /** Despesas operacionais: aluguel, ferramentas, marketing, etc (centavos). */
  opexCents: bigint;
}

export type EbitdaZone = "negativa" | "apertada" | "saudavel" | "otima";

export interface EbitdaResult {
  /** EBITDA = receita − custos − despesas operacionais (centavos). */
  ebitdaCents: bigint;
  /** Margem EBITDA = EBITDA ÷ receita. */
  ebitdaMarginPct: number;
  /** Soma de custos + despesas (centavos). */
  totalCostsCents: bigint;
  /** Faixa de saúde da margem EBITDA. */
  zone: EbitdaZone;
}

/**
 * Serviço puro: EBITDA simplificado para autônomo/PJ pequeno. Mede a geração
 * de caixa da operação antes de juros, impostos, depreciação e amortização.
 * Aqui: receita menos custos diretos e despesas operacionais. Sem I/O.
 */
export class EbitdaService {
  static compute(input: EbitdaInput): EbitdaResult {
    const revenue = Number(input.revenueCents) / 100;
    const ebitdaCents = input.revenueCents - input.cogsCents - input.opexCents;
    const ebitda = Number(ebitdaCents) / 100;
    const ebitdaMarginPct = revenue > 0 ? (ebitda / revenue) * 100 : 0;
    return {
      ebitdaCents,
      ebitdaMarginPct,
      totalCostsCents: input.cogsCents + input.opexCents,
      zone: zoneOf(ebitdaMarginPct),
    };
  }
}

/**
 * Faixas de referência da margem EBITDA (parâmetro genérico para PJ pequeno;
 * o saudável varia por setor): negativa < 0; apertada < 10%; saudável < 25%;
 * acima disso, ótima.
 */
function zoneOf(marginPct: number): EbitdaZone {
  if (marginPct < 0) return "negativa";
  if (marginPct < 10) return "apertada";
  if (marginPct < 25) return "saudavel";
  return "otima";
}
