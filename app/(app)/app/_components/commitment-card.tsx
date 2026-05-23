import { HowItWorksSheet } from "./how-it-works-sheet";

export interface CommitmentCardProps {
  pct: number;
}

type Zone = "excellent" | "healthy" | "attention" | "critical";

function zoneOf(pct: number): Zone {
  if (!Number.isFinite(pct) || pct >= 0.5) return "critical";
  if (pct >= 0.3) return "attention";
  if (pct >= 0.15) return "healthy";
  return "excellent";
}

const ZONE_TEXT: Record<Zone, { label: string; color: string }> = {
  excellent: { label: "Excelente: muito espaço para investir.", color: "var(--semantic-positive)" },
  healthy: { label: "Você está na zona saudável.", color: "var(--semantic-positive)" },
  attention: { label: "Atenção: comprometimento médio.", color: "var(--semantic-warning)" },
  critical: { label: "Crítico: considere simular cenários.", color: "var(--semantic-negative)" },
};

const ZONE_FILL: Record<Zone, string> = {
  excellent: "linear-gradient(90deg, #16a34a, #22c55e)",
  healthy: "linear-gradient(90deg, #65a30d, #84cc16)",
  attention: "linear-gradient(90deg, #ca8a04, #eab308)",
  critical: "linear-gradient(90deg, #dc2626, #ef4444)",
};

export function CommitmentCard({ pct }: CommitmentCardProps) {
  const rawPct = Number.isFinite(pct) ? pct : 1;
  const cappedPct = Math.max(0, Math.min(1, rawPct));
  const overflow = rawPct > 1;
  const display = (Math.max(0, rawPct) * 100).toFixed(0);
  const zone = zoneOf(rawPct);
  const tone = ZONE_TEXT[zone];
  const fill = ZONE_FILL[zone];
  return (
    <section className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[18px] pb-[18px] pt-[14px] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Renda comprometida
          </span>
          <HowItWorksSheet topic="renda-comprometida" variant="brand" />
        </div>
        <span
          className="shrink-0 text-[22px] font-extrabold leading-none"
          style={{ letterSpacing: "-0.5px", color: tone.color }}
        >
          {display}
          <span className="ml-0.5 text-[14px] font-semibold opacity-70">%</span>
        </span>
      </div>
      <div
        className="relative mt-3 h-3 overflow-hidden rounded-full"
        style={{
          background:
            "linear-gradient(90deg, #bbf7d0 0% 15%, #dcfce7 15% 30%, #fef3c7 30% 50%, #fee2e2 50% 100%)",
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${cappedPct * 100}%`,
            background: fill,
            boxShadow: overflow ? "0 0 8px rgba(220,38,38,0.6)" : undefined,
          }}
        />
        {cappedPct < 1 ? (
          <div
            className="absolute -bottom-1 -top-1 w-1 rounded"
            style={{
              left: `calc(${cappedPct * 100}% - 2px)`,
              background: "var(--text-primary)",
              boxShadow: "0 0 0 3px var(--bg-app), 0 2px 6px rgba(0,0,0,0.2)",
            }}
          />
        ) : null}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-[color:var(--text-muted)] md:text-[10px]">
        <span>Excelente</span>
        <span>Saudável</span>
        <span>Atenção</span>
        <span>Crítico</span>
      </div>
      <div
        className="mt-3 flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: tone.color }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: tone.color }} />
        {tone.label}
      </div>
    </section>
  );
}
