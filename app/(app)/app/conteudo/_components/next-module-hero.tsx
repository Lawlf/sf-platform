import { Clock } from "lucide-react";

import type { ModuleSpec } from "../_lib/trilhas";

export interface NextModuleHeroProps {
  module: ModuleSpec;
}

export function NextModuleHero({ module }: NextModuleHeroProps) {
  return (
    <article
      className="relative overflow-hidden rounded-[22px] border border-[color:var(--color-brand-500)]/[0.22] bg-[color:var(--surface-1)] p-6 backdrop-blur-xl"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(242,142,37,0.20), transparent 65%)",
        boxShadow:
          "0 24px 60px -16px rgba(31,29,28,0.12), 0 0 0 1px rgba(242,142,37,0.06)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--border-strong)] to-transparent"
      />
      <div className="mb-2.5 inline-flex items-center gap-1.5 text-[0.65625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand-500)]"
          style={{ boxShadow: "0 0 0 3px rgba(242,142,37,0.22)" }}
        />
        Próximo módulo
      </div>
      <h2 className="font-serif text-[1.375rem] font-bold leading-[1.2] tracking-[-0.015em] text-[color:var(--text-primary)]">
        {module.title}
      </h2>
      <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
        Capítulo {String(module.num).padStart(2, "0")} · {module.subtitle}
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-3.5 py-2.5 text-[0.75rem] text-[color:var(--text-secondary)]">
        <Clock size={14} strokeWidth={2.2} aria-hidden className="text-[color:var(--color-brand-800)]" />
        <span>
          Em construção.{" "}
          <strong className="font-bold text-[color:var(--color-brand-800)]">
            Te avisamos quando chegar.
          </strong>
        </span>
      </div>
    </article>
  );
}
