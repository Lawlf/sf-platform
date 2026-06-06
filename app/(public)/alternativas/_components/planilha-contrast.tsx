import { Check } from "lucide-react";

/**
 * Hero da página vs Planilha. Personalidade: "a planilha você mantém, o Sabor se
 * mantém sozinho". Contrasta uma planilha com fórmula quebrada e desatualizada
 * com o quadro do mês sempre em dia. Conteúdo ilustrativo, decorativo
 * (aria-hidden nos painéis).
 */
const CELLS: ReadonlyArray<string> = [
  "1.240",
  "890",
  "2.100",
  "650",
  "#ERRO",
  "1.300",
  "420",
  "980",
  "1.750",
];

const SABOR_TILES: ReadonlyArray<{ label: string; value: string; tone: string }> = [
  { label: "O que você tem", value: "R$ 32.400", tone: "var(--semantic-positive)" },
  { label: "O que você deve", value: "R$ 12.100", tone: "var(--semantic-negative)" },
  { label: "O que você ganha", value: "R$ 6.800", tone: "var(--color-brand-700)" },
];

export function PlanilhaContrast() {
  return (
    <section>
      <h2
        className="text-base font-bold text-[color:var(--text-primary)]"
        style={{ letterSpacing: "-0.01em" }}
      >
        A planilha você mantém. O Sabor se mantém sozinho.
      </h2>
      <p className="mb-4 mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Fórmula quebra, você esquece de preencher, ela desatualiza. Aqui a conta é feita pra você,
        sempre no celular.
      </p>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        <div
          aria-hidden
          className="flex-1 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
        >
          <div className="text-[0.625rem] font-bold uppercase tracking-[0.6px] text-[color:var(--text-muted)]">
            Sua planilha
          </div>
          <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--border-soft)]">
            {CELLS.map((cell, i) => (
              <div
                key={`${cell}-${i}`}
                className={`bg-[color:var(--surface-1)] px-2 py-2 text-center text-[0.625rem] tabular-nums ${
                  cell === "#ERRO"
                    ? "font-bold text-[color:var(--semantic-negative)]"
                    : "text-[color:var(--text-muted)]"
                }`}
              >
                {cell}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.6875rem] font-medium text-[color:var(--text-secondary)]">
            Atualizada há 3 meses. E uma fórmula quebrou.
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
              Seu Sabor
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-brand-500)]/[0.16] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--color-brand-700)]">
              <Check size={10} strokeWidth={3} aria-hidden />
              Em dia
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
            Sempre em dia, no celular. Sem fórmula pra manter.
          </p>
        </div>
      </div>
    </section>
  );
}
