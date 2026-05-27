import type { Prescription } from "@/domain/services/prescription/prescription.types";

import type { TrilhaSlug } from "./trilhas";

export interface ContentSuggestion {
  trilhaSlug: TrilhaSlug;
  moduleNum: number;
  ready: boolean;
  contextLabels: { targetDebtLabel?: string };
}

export function suggestContent(prescription: Prescription | null): ContentSuggestion | null {
  if (!prescription || prescription.state === "incomplete" || !prescription.dominant) {
    return null;
  }
  const { state, dominant } = prescription;
  const contextLabels: { targetDebtLabel?: string } =
    dominant.targetDebtLabel !== undefined
      ? { targetDebtLabel: dominant.targetDebtLabel }
      : {};

  switch (state) {
    case "bleeding":
      return { trilhaSlug: "sair-do-vermelho", moduleNum: 2, ready: true, contextLabels };
    case "tight":
      return {
        trilhaSlug: "sair-do-vermelho",
        moduleNum: dominant.type === "pay_debt" ? 2 : 1,
        ready: true,
        contextLabels,
      };
    case "no_cushion":
      return { trilhaSlug: "sobrar-e-fazer-render", moduleNum: 1, ready: false, contextLabels };
    case "ready_to_grow":
      return { trilhaSlug: "compor-patrimonio", moduleNum: 1, ready: false, contextLabels };
    default:
      return null;
  }
}
