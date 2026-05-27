import type { ReactNode } from "react";

/** Cartão de resultado padrão dos simuladores: vidro + título em destaque marca. */
export function ResultCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  return (
    <section className="glass-light p-4">
      <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">{subtitle}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </section>
  );
}

/** Número de destaque dentro de um ResultCard. */
export function ResultHeadline({
  value,
  tone = "neutral",
  caption,
}: {
  value: string;
  tone?: "positive" | "negative" | "neutral" | undefined;
  caption?: string | undefined;
}) {
  const color =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : tone === "negative"
        ? "text-[color:var(--semantic-negative)]"
        : "text-[color:var(--text-primary)]";
  return (
    <div>
      <div className={`text-[1.375rem] font-extrabold leading-none ${color}`}>{value}</div>
      {caption ? (
        <p className="mt-1.5 text-[0.6875rem] text-[color:var(--text-secondary)]">{caption}</p>
      ) : null}
    </div>
  );
}

/** Linha rótulo + valor para detalhes secundários. */
export function ResultStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span className="font-bold text-[color:var(--text-primary)]">{value}</span>
    </div>
  );
}

/** Linha de uma decomposição (ex.: bruto - INSS - IR = líquido). */
export function BreakdownLine({
  label,
  value,
  tone = "neutral",
}: {
  label: ReactNode;
  value: string;
  tone?: "neutral" | "negative" | "positive";
}) {
  const color =
    tone === "negative"
      ? "text-[color:var(--semantic-negative)]"
      : tone === "positive"
        ? "text-[color:var(--semantic-positive)]"
        : "text-[color:var(--text-primary)]";
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[0.8125rem]">
      <span className="text-[color:var(--text-secondary)]">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

/** Banner de ganho (economia) destacado em tom positivo. */
export function ResultHighlight({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-[color:var(--semantic-positive)]/25 bg-[color:var(--semantic-positive)]/[0.08] p-4 text-[0.8125rem] leading-relaxed text-[color:var(--semantic-positive)]">
      {children}
    </p>
  );
}

/** Mensagem de erro padrão das ações de simulação. */
export function ResultError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
    >
      {message}
    </p>
  );
}

/** Select padrão dos simuladores (mesma régua visual do wizardInputClass). */
export const simSelectClass =
  "w-full appearance-none rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";
