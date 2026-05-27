import { Lightbulb } from "lucide-react";

import { HowItWorksSheet, type HowItWorksTopic } from "../../_components/how-it-works-sheet";

interface SimHowItWorksProps {
  topic: HowItWorksTopic;
  summary: string;
}

/**
 * Cartão de abertura dos simuladores: explica em uma linha o que a ferramenta
 * faz e abre a folha "Como funciona" com o método manual. A gente faz e ensina.
 */
export function SimHowItWorks({ topic, summary }: SimHowItWorksProps) {
  return (
    <section className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
        aria-hidden
      >
        <Lightbulb size={18} strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-col items-start gap-2.5">
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          {summary}
        </p>
        <HowItWorksSheet topic={topic} variant="brand" />
      </div>
    </section>
  );
}
