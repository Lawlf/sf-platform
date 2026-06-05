import { type Level, OPTION_PROFILE } from "../_lib/options";

const RETURN_LABEL: Record<Level, string> = { 1: "Baixo", 2: "Médio", 3: "Alto" };
const RISK_LABEL: Record<Level, string> = { 1: "Baixo", 2: "Médio", 3: "Alto" };
const LIQ_LABEL: Record<Level, string> = { 1: "Baixa", 2: "Média", 3: "Alta" };

function Bar({ level, tone }: { level: Level; tone: "brand" | "negative" | "neutral" }) {
  const color =
    tone === "negative"
      ? "var(--semantic-negative)"
      : tone === "brand"
        ? "var(--color-brand-500)"
        : "var(--text-secondary)";
  return (
    <span className="flex gap-1" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-1.5 w-6 rounded-full"
          style={{
            backgroundColor: i <= level ? color : "var(--surface-3)",
          }}
        />
      ))}
    </span>
  );
}

export function PerfilBars({ optionKey }: { optionKey: string }) {
  const p = OPTION_PROFILE[optionKey];
  if (!p) return null;

  const rows: { label: string; value: string; level: Level; tone: "brand" | "negative" | "neutral" }[] = [
    { label: "Potencial de retorno", value: RETURN_LABEL[p.retorno], level: p.retorno, tone: "brand" },
    { label: "Risco", value: RISK_LABEL[p.risco], level: p.risco, tone: "negative" },
    { label: "Liquidez", value: LIQ_LABEL[p.liquidez], level: p.liquidez, tone: "neutral" },
  ];

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        Perfil
      </h3>
      <dl className="mt-2.5 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <dt className="text-[0.8125rem] text-[color:var(--text-secondary)]">{r.label}</dt>
            <dd className="flex items-center gap-2">
              <span className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
                {r.value}
              </span>
              <Bar level={r.level} tone={r.tone} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
