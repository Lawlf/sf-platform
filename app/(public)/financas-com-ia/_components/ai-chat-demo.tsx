import { Sparkles } from "lucide-react";

import { RevealOnScroll } from "../../_components/reveal-on-scroll";

/**
 * Mockup ilustrativo de conversa. NÃO chama IA nenhuma: o Sabor não roda IA. É
 * uma demonstração roteirizada do que a IA do usuário (ChatGPT, Claude) responde
 * lendo os dados do Sabor via MCP. Números ilustrativos, rotulado como exemplo.
 * As bolhas entram com leve animação de entrada (reduced-motion safe).
 */
const MESSAGES: ReadonlyArray<{ role: "user" | "ai"; text: string }> = [
  { role: "user", text: "Quanto falta pra quitar meu financiamento?" },
  {
    role: "ai",
    text: "Pelo seu Sabor, faltam R$ 18.400, uns 14 meses. Pagando R$ 300 a mais por mês, cai pra 11.",
  },
  { role: "user", text: "Tô melhor que mês passado?" },
  {
    role: "ai",
    text: "Sim. Seu patrimônio subiu R$ 1.900 e a dívida caiu R$ 600. O mês fechou no positivo.",
  },
];

export function AiChatDemo() {
  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
      style={{ boxShadow: "var(--shadow-glass-strong)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[color:var(--color-brand-500)]/[0.12] blur-2xl"
      />
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-[color:var(--color-brand-700)]">
          <Sparkles size={13} strokeWidth={2} aria-hidden />
          A sua IA, com os seus números
        </span>
        <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
          Exemplo
        </span>
      </div>

      <RevealOnScroll as="div" stagger className="mt-4 flex flex-col gap-2.5">
        {MESSAGES.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <p
              className={
                m.role === "user"
                  ? "max-w-[82%] rounded-2xl rounded-br-sm bg-[color:var(--surface-2)] px-3.5 py-2 text-[0.8125rem] text-[color:var(--text-primary)]"
                  : "max-w-[88%] rounded-2xl rounded-bl-sm bg-[color:var(--color-brand-500)]/[0.10] px-3.5 py-2 text-[0.8125rem] leading-relaxed text-[color:var(--text-primary)]"
              }
            >
              {m.text}
            </p>
          </div>
        ))}
      </RevealOnScroll>
    </div>
  );
}
