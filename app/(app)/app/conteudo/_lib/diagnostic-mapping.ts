import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";

import type { TrilhaSlug } from "./trilhas";

export const DIAGNOSTIC_TO_TRILHA: Record<ContentDiagnosticAnswer, TrilhaSlug> = {
  "pagar-divida": "sair-do-vermelho",
  guardar: "sobrar-e-fazer-render",
  investir: "compor-patrimonio",
};

export interface AnswerOption {
  answer: ContentDiagnosticAnswer;
  num: string;
  title: string;
  description: string;
}

export const ANSWER_OPTIONS: readonly AnswerOption[] = [
  {
    answer: "pagar-divida",
    num: "01",
    title: "Pagar uma dívida",
    description:
      "Fatura do cartão, parcela atrasada, cheque especial. Tem conta correndo juros e ela vem primeiro.",
  },
  {
    answer: "guardar",
    num: "02",
    title: "Guardar pro que vier",
    description:
      "Sem dívida cara hoje. Quero reserva de emergência, Tesouro Selic, CDB de liquidez diária, base sólida antes de arriscar.",
  },
  {
    answer: "investir",
    num: "03",
    title: "Investir pra render",
    description:
      "Reserva já feita. Penso em ações, FIIs, ETFs, cripto, alocação, imposto. Quero a carteira trabalhando.",
  },
] as const;
