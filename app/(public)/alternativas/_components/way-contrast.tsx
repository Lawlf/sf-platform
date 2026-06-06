import { Bucket } from "./bucket";

/**
 * Contraste de LENTE (não de esforço de input, que o Open Finance derruba): os
 * dois veem os gastos, a diferença é onde você olha. A gota = cada transação,
 * detalhe sobre detalhe. O balde = o patrimônio do mês enchendo (a trajetória).
 * Conteúdo ilustrativo e genérico, igual para qualquer concorrente micro, por
 * isso vive no template e não no registry.
 */
const DROPS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Mercado", value: "92,40" },
  { label: "Uber", value: "23,90" },
  { label: "Café", value: "8,50" },
  { label: "Farmácia", value: "64,00" },
  { label: "iFood", value: "47,80" },
  { label: "Padaria", value: "14,20" },
  { label: "Streaming", value: "39,90" },
  { label: "Lanche", value: "27,50" },
  { label: "Mercado", value: "56,30" },
  { label: "Cinema", value: "44,00" },
];

export function WayContrast() {
  return (
    <section>
      <h2
        className="text-base font-bold text-[color:var(--text-primary)]"
        style={{ letterSpacing: "-0.01em" }}
      >
        Não conte cada gota. Olhe o balde encher.
      </h2>
      <p className="mb-4 mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Os dois veem seus gastos. A diferença é onde você olha: cada transação, ou o balde enchendo
        no fim do mês.
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        <div
          aria-hidden
          className="relative flex-1 overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
        >
          <div className="text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--text-muted)]">
            A gota: cada transação
          </div>
          <ul className="mt-3 flex flex-col">
            {DROPS.map((e, i) => (
              <li
                key={`${e.label}-${i}`}
                className="flex items-center justify-between border-b border-dashed border-[color:var(--border-soft)] py-[5px] text-[0.6875rem] text-[color:var(--text-muted)]"
              >
                <span>{e.label}</span>
                <span className="tabular-nums">- {e.value}</span>
              </li>
            ))}
          </ul>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-9 h-16 bg-[linear-gradient(to_top,var(--surface-2),transparent)]"
          />
          <p className="relative mt-3 text-[0.6875rem] font-medium text-[color:var(--text-secondary)]">
            Onde foi cada real. Detalhe sobre detalhe.
          </p>
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
            className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[color:var(--color-brand-500)]/[0.16] blur-2xl"
          />
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-col">
              <div className="text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-700)]">
                O balde: o que você tem
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className="text-[1.75rem] font-extrabold leading-none text-[color:var(--text-primary)]"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  R$ 32.400
                </span>
                <span className="text-[0.75rem] font-bold text-[color:var(--semantic-positive)]">
                  subindo
                </span>
              </div>
              <p className="mt-2 text-[0.6875rem] font-medium text-[color:var(--text-secondary)]">
                Está enchendo? É isso que importa.
              </p>
            </div>
            <Bucket className="h-28 w-auto shrink-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
