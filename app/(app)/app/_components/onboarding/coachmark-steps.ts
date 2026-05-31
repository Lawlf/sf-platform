export interface CoachmarkStep {
  target: string; // CSS selector for the anchored element
  title: string;
  body: string;
}

// Ordem segue a posicao visual na home (topo para baixo) para o scroll fluir natural.
export const COACHMARK_STEPS: CoachmarkStep[] = [
  {
    target: '[data-tour="hero"]',
    title: "Sua foto do mês",
    body: "Quanto entra, quanto sai e o que sobra, tudo num lugar só.",
  },
  {
    target: '[data-tour="quick-access"]',
    title: "Acessos rápidos",
    body: "Atalhos para o que você mais usa. Dá para personalizar no Pro.",
  },
  {
    target: '[data-tour="next-step"]',
    title: "Seu próximo passo",
    body: "Todo mês mostramos o movimento certo para você, com base nos seus números.",
  },
  {
    target: '[data-tour="goals"]',
    title: "Suas metas",
    body: "Acompanhe o progresso e a previsão de quando você chega lá.",
  },
  {
    target: '[data-tour="health"]',
    title: "Sua saúde financeira",
    body: "O quanto da sua renda já está comprometida, num olhar.",
  },
];

export function clampIndex(i: number): number {
  if (i < 0) return 0;
  if (i > COACHMARK_STEPS.length - 1) return COACHMARK_STEPS.length - 1;
  return i;
}
