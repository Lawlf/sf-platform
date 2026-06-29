export interface CoachmarkStep {
  target: string; // CSS selector for the anchored element
  title: string;
  body: string;
}

// A ordem aqui é só a lista de candidatos. A home renderiza os cards em ordem
// dinâmica (home-layout.ts), então o tour ordena pela posição real no DOM em tempo
// de execução (ver visibleSteps em home-coachmarks.client.tsx).
export const COACHMARK_STEPS: CoachmarkStep[] = [
  {
    target: '[data-tour="hero"]',
    title: "Seu resumo do mês",
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
    target: '[data-tour="projection"]',
    title: "Sua projeção",
    body: "No ritmo atual, quanto o que é seu cresce por mês e onde chega com o tempo.",
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

export interface StepGates {
  hasGoal: boolean;
}

const GOALS_TARGET = '[data-tour="goals"]';

// Remove passos sem dado real ANTES de medir o DOM. O card de meta renderiza null
// quando o usuario nao tem meta, mas durante o streaming do Suspense o esqueleto
// ocupa altura > 0 e enganaria o filtro por altura -> o passo aparecia vazio.
export function gateSteps(steps: CoachmarkStep[], gates: StepGates): CoachmarkStep[] {
  return steps.filter((s) => s.target !== GOALS_TARGET || gates.hasGoal);
}

export function clampIndex(i: number): number {
  if (i < 0) return 0;
  if (i > COACHMARK_STEPS.length - 1) return COACHMARK_STEPS.length - 1;
  return i;
}
