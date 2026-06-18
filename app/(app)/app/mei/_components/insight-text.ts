import type { SerializedMeiInsight } from "../_actions/fetch-mei-diagnostic";

export function insightText(ins: SerializedMeiInsight): string {
  switch (ins.kind) {
    case "pro_labore_curto":
      return `Seu pró-labore cobre só ${ins.coberturaPct ?? 0}% dos seus custos fixos do mês. Você está tirando ${ins.diffCents ?? "R$ 0,00"} da reserva pra fechar o mês.`;

    case "mistura_pf_pj":
      return `${ins.valorCents ?? "R$ 0,00"} de gasto pessoal saiu pela conta da empresa${ins.pctFaturamento !== undefined ? ` (${ins.pctFaturamento}% do faturamento)` : ""}, sem registro como retirada.`;

    case "salario_real":
      return `Seu salário real esse mês foi ${ins.salarioReal ?? "R$ 0,00"}: ${ins.proLabore ?? "R$ 0,00"} de pró-labore + ${ins.gastoPessoalPj ?? "R$ 0,00"} que saiu direto pela empresa.`;

    case "caixa_preso":
      return `Sobraram ${ins.valorCents ?? "R$ 0,00"} na empresa esse mês. Esse dinheiro é seu, mas não está na sua conta pessoal.`;
  }
}
