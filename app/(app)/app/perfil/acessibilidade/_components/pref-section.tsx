import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Seção de acessibilidade: sem borda própria, separada por linha (divide-y no
 *  container). Aplica direto — não tem botão salvar. */
export function PrefSection({ eyebrow, title, description, children }: Props) {
  return (
    <section className="py-6 first:pt-0">
      <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
        <span
          className="block h-[1.5px] w-3.5 rounded-full"
          style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
        />
        {eyebrow}
      </div>
      <h2 className="mt-1.5 text-[1.0625rem] font-bold leading-[1.3] tracking-[-0.01em] text-[color:var(--text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-[0.8125rem] leading-[1.5] text-[color:var(--text-secondary)]">
          {description}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
