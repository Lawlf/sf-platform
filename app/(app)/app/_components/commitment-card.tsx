import type { Route } from "next";
import Link from "next/link";

import { HowItWorksSheet } from "./how-it-works-sheet";

export interface CommitmentCardProps {
  pct: number;
}

type Zone = "excellent" | "healthy" | "attention" | "tight" | "severe" | "over";

function zoneOf(pct: number): Zone {
  if (!Number.isFinite(pct) || pct >= 1) return "over";
  if (pct >= 0.8) return "severe";
  if (pct >= 0.5) return "tight";
  if (pct >= 0.3) return "attention";
  if (pct >= 0.15) return "healthy";
  return "excellent";
}

const ZONE_TEXT: Record<Zone, { label: string; color: string }> = {
  excellent: { label: "Sobra bastante da renda depois das parcelas.", color: "var(--semantic-positive)" },
  healthy: { label: "As parcelas cabem bem na sua renda.", color: "var(--semantic-positive)" },
  attention: { label: "Quase metade da renda já vai pra parcela fixa.", color: "var(--semantic-warning)" },
  tight: { label: "A maior parte da renda já vai pra parcela fixa.", color: "var(--semantic-negative)" },
  severe: { label: "Quase toda a renda já está comprometida com parcela fixa.", color: "var(--semantic-negative)" },
  over: { label: "As parcelas já passam da sua renda. Dá pra atacar isso por partes.", color: "var(--semantic-negative)" },
};

// Cores vêm das vars semânticas para honrar o modo daltônico (positivo
// vira azul em [data-cb="on"]). Excelente e saudável = positivo.
const ZONE_FILL: Record<Zone, string> = {
  excellent: "var(--semantic-positive)",
  healthy: "var(--semantic-positive)",
  attention: "var(--semantic-warning)",
  tight: "var(--semantic-negative)",
  severe: "var(--semantic-negative)",
  over: "var(--semantic-negative)",
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
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Quanto da renda já tem dono
          </span>
          <HowItWorksSheet topic="renda-comprometida" variant="brand" />
        </div>
        <span
          className="shrink-0 text-[1.375rem] font-extrabold leading-none"
          style={{ letterSpacing: "-0.5px", color: tone.color }}
        >
          {display}
          <span className="ml-0.5 text-[0.875rem] font-semibold opacity-70">%</span>
        </span>
      </div>
      <div
        className="commitment-track relative mt-3 h-3 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={Number(display)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Quanto da renda já tem dono: ${display}%. ${tone.label}`}
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
        {overflow ? (
          <span
            aria-hidden
            className="absolute inset-y-0 right-1 flex items-center text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex justify-between text-[0.5625rem] text-[color:var(--text-muted)] md:text-[0.625rem]">
        <span>Folga</span>
        <span>Tranquilo</span>
        <span>Apertado</span>
        <span>No limite</span>
      </div>
      <div
        className="mt-3 flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: tone.color }}
      >
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tone.color }} />
        {tone.label}
      </div>
      {zone === "over" ? (
        <a
          href="#movimento-do-mes"
          className="focus-ring mt-5 flex w-full items-center justify-center rounded-xl bg-[color:var(--color-brand-500)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[color:var(--color-brand-600)]"
        >
          Ver o movimento do mês
        </a>
      ) : zone === "attention" || zone === "tight" || zone === "severe" ? (
        <Link
          href={"/app/simular/quitacao" as Route}
          className="mt-2 inline-flex text-xs font-semibold text-[color:var(--color-brand-700)] hover:underline"
        >
          Simular como reduzir
        </Link>
      ) : null}
    </section>
  );
}
