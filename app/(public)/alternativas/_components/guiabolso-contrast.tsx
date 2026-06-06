import { Check, PowerOff } from "lucide-react";

/**
 * Hero da página vs GuiaBolso. Personalidade: "o app que acabou". O GuiaBolso
 * foi encerrado em 2022; o contraste é entre um app desligado e o Sabor, ativo e
 * com o quadro do mês. Fato, não deboche. Conteúdo ilustrativo, decorativo
 * (aria-hidden nos painéis).
 */
const SABOR_TILES: ReadonlyArray<{ label: string; value: string; tone: string }> = [
  { label: "O que você tem", value: "R$ 32.400", tone: "var(--semantic-positive)" },
  { label: "O que você deve", value: "R$ 12.100", tone: "var(--semantic-negative)" },
  { label: "O que você ganha", value: "R$ 6.800", tone: "var(--color-brand-700)" },
];

export function GuiabolsoContrast() {
  return (
    <section>
      <h2
        className="text-base font-bold text-[color:var(--text-primary)]"
        style={{ letterSpacing: "-0.01em" }}
      >
        Um app que acabou, ou um que segue com você?
      </h2>
      <p className="mb-4 mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        O GuiaBolso foi encerrado em 2022. O Sabor está ativo, em evolução, e mostra o seu mês.
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        <div
          aria-hidden
          className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-6 text-center"
        >
          <PowerOff size={30} strokeWidth={1.75} aria-hidden className="text-[color:var(--text-muted)]" />
          <div className="mt-3 text-[0.8125rem] font-bold text-[color:var(--text-secondary)]">
            GuiaBolso
          </div>
          <span className="mt-2 rounded-full bg-[color:var(--surface-3)] px-2.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
            Encerrado em 2022
          </span>
        </div>

        <div className="flex items-center justify-center py-1 sm:py-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[0.625rem] font-bold uppercase text-[color:var(--text-muted)] shadow-sm">
            ou
          </span>
        </div>

        <div
          aria-hidden
          className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
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
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-brand-500)]/[0.16] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--color-brand-700)]">
              <Check size={10} strokeWidth={3} aria-hidden />
              Ativo
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
            O quadro do mês, e não vai sumir.
          </p>
        </div>
      </div>
    </section>
  );
}
