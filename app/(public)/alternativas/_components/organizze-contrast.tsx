import { Lock } from "lucide-react";

/**
 * Hero da página vs Organizze. Personalidade: "gastos é só um pedaço, e aqui
 * começa de graça". Contrasta uma fatia (gastos) trancada atrás de assinatura
 * com o quadro inteiro (patrimônio, dívida, renda) no plano grátis. Conteúdo
 * ilustrativo, decorativo (aria-hidden nos painéis).
 */
const SABOR_TILES: ReadonlyArray<{ label: string; value: string; tone: string }> = [
  { label: "O que você tem", value: "R$ 32.400", tone: "var(--semantic-positive)" },
  { label: "O que você deve", value: "R$ 12.100", tone: "var(--semantic-negative)" },
  { label: "O que você ganha", value: "R$ 6.800", tone: "var(--color-brand-700)" },
];

export function OrganizzeContrast() {
  return (
    <section>
      <h2
        className="text-base font-bold text-[color:var(--text-primary)]"
        style={{ letterSpacing: "-0.01em" }}
      >
        Gastos é só um pedaço. E aqui você começa de graça.
      </h2>
      <p className="mb-4 mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        O Organizze foca nos seus gastos, atrás de uma assinatura. O Sabor mostra o quadro inteiro,
        e tem plano grátis.
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        <div
          aria-hidden
          className="flex-1 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
        >
          <div className="text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--text-muted)]">
            Organizze
          </div>
          <div className="mt-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
                Gastos do mês
              </span>
              <Lock size={13} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
            </div>
            <div className="mt-2 select-none text-[1.1rem] font-extrabold text-[color:var(--text-muted)] blur-[3px]">
              R$ 3.480
            </div>
            <span className="mt-2 inline-block rounded-full bg-[color:var(--surface-3)] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
              Plano pago
            </span>
          </div>
          <p className="mt-3 text-[0.6875rem] font-medium text-[color:var(--text-secondary)]">
            Uma parte só, e atrás de assinatura.
          </p>
        </div>

        <div className="flex items-center justify-center py-1 sm:py-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[0.625rem] font-bold uppercase text-[color:var(--text-muted)] shadow-sm">
            vs
          </span>
        </div>

        <div
          aria-hidden
          className="relative flex-1 overflow-hidden rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-glass-strong)" }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[color:var(--color-brand-500)]/[0.14] blur-2xl"
          />
          <div className="flex items-center justify-between">
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-700)]">
              Sabor
            </span>
            <span className="rounded-full bg-[color:var(--color-brand-500)]/[0.16] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--color-brand-700)]">
              Grátis
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {SABOR_TILES.map((t) => (
              <div
                key={t.label}
                className="flex items-center justify-between rounded-xl bg-[color:var(--surface-2)] px-3 py-2"
              >
                <span className="text-[0.6875rem] font-medium text-[color:var(--text-secondary)]">
                  {t.label}
                </span>
                <span className="text-[0.875rem] font-extrabold" style={{ color: t.tone }}>
                  {t.value}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.6875rem] font-medium text-[color:var(--text-secondary)]">
            Patrimônio, dívida e renda. O quadro inteiro.
          </p>
        </div>
      </div>
    </section>
  );
}
