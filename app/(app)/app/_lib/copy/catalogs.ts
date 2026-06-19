import type { Catalog } from "./types";

// Copy que muda conforme o perfil ativo (PF vs PJ_MEI). PF = `default`.
// Migra 1:1 para next-intl: { default, PJ_MEI } vira ICU {ctx, select, ...}.

export const addHubCopy = {
  "income.title": { default: "Recebo todo mês", PJ_MEI: "Recebo do meu negócio" },
  "income.desc": {
    default: "Salário, aposentadoria, aluguel, freela fixo.",
    PJ_MEI: "Venda, serviço, pró-labore.",
  },
  "patrimonio.desc": {
    default: "Carro, casa, reserva, investimento.",
    PJ_MEI: "Equipamento, estoque, caixa, reserva.",
  },
  "lancar.desc": {
    default: "Um PIX, uma venda, um gasto avulso.",
    PJ_MEI: "Uma venda, um PIX, um custo do negócio.",
  },
} satisfies Catalog;

export const incomeCopy = {
  "new.subtitle": {
    default: "Salário, freela, aluguel, comissão. Cadastre uma nova fonte.",
    PJ_MEI: "Faturamento, pró-labore, serviço fixo. Cadastre uma nova fonte.",
  },
  "form.namePlaceholder": {
    default: "Ex: Salário, freela, aluguel, comissão",
    PJ_MEI: "Ex: Faturamento, pró-labore, contrato fixo",
  },
  // Vazio para PJ_MEI: MEI não tem salário CLT, o atalho não faz sentido.
  "form.cltNudge": {
    default: "Só sei o salário no papel? Calcular o que cai na conta",
    PJ_MEI: "",
  },
} satisfies Catalog;

export const lancarCopy = {
  "page.subtitle": {
    default: "Um PIX, uma venda, um gasto do dia.",
    PJ_MEI: "Uma venda, um custo, um PIX do dia.",
  },
  "form.inPlaceholder": { default: "Freela extra", PJ_MEI: "Venda balcão" },
  "form.outPlaceholder": { default: "Mercado da semana", PJ_MEI: "Material / fornecedor" },
} satisfies Catalog;

export const debtCopy = {
  "kind.bought.desc": {
    default:
      "À vista, cartão parcelado, crediário ou financiamento. Notebook, geladeira, carro, até IPVA parcelado.",
    PJ_MEI:
      "À vista, cartão parcelado, crediário ou financiamento. Equipamento, estoque, máquina, veículo do negócio.",
  },
} satisfies Catalog;
