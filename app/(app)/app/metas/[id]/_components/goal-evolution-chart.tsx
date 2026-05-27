"use client";

import type { SerializedGoalSnapshot } from "../../_actions/goal-queries";

interface GoalEvolutionChartProps {
  snapshots: SerializedGoalSnapshot[];
}

function fmtMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function fmtBrl(cents: string): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 8 };
const VIEW_W = 400;
const VIEW_H = 160;

export function GoalEvolutionChart({ snapshots }: GoalEvolutionChartProps) {
  const sorted = [...snapshots].sort((a, b) => a.monthIso.localeCompare(b.monthIso));

  if (sorted.length === 0) {
    return (
      <p className="text-center text-[0.8125rem] text-[color:var(--text-muted)]">
        Nenhum dado de evolucao ainda.
      </p>
    );
  }

  const lastSnap = sorted[sorted.length - 1]!;
  const targetCents = Number(lastSnap.targetCents);

  if (sorted.length === 1) {
    const snap = sorted[0]!;
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">{fmtMonth(snap.monthIso)}</span>
          <span className="text-[1rem] font-bold text-[color:var(--text-primary)]">
            {fmtBrl(snap.currentCents)}
          </span>
        </div>
        <p className="text-center text-[0.75rem] text-[color:var(--text-muted)]">
          A curva enche a cada mes.
        </p>
      </div>
    );
  }

  const chartW = VIEW_W - PADDING.left - PADDING.right;
  const chartH = VIEW_H - PADDING.top - PADDING.bottom;

  const values: number[] = sorted.map((s) => Number(s.currentCents));
  const minV = Math.min(0, ...values);
  const maxV = Math.max(targetCents, ...values);
  const rangeV = maxV - minV || 1;

  function toX(i: number): number {
    return PADDING.left + (i / (sorted.length - 1)) * chartW;
  }

  function toY(v: number): number {
    return PADDING.top + chartH - ((v - minV) / rangeV) * chartH;
  }

  const linePath = sorted
    .map((s, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(Number(s.currentCents))}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L${toX(sorted.length - 1)},${PADDING.top + chartH} L${toX(0)},${PADDING.top + chartH} Z`;

  const targetY = toY(targetCents);

  const firstLabel = fmtMonth(sorted[0]!.monthIso);
  const lastLabel = fmtMonth(lastSnap.monthIso);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        aria-label="Curva de evolucao da meta"
        className="w-full"
        style={{ height: "auto" }}
      >
        <defs>
          <linearGradient id="goal-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef7a1a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ef7a1a" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Target dashed line */}
        <line
          x1={PADDING.left}
          y1={targetY}
          x2={VIEW_W - PADDING.right}
          y2={targetY}
          stroke="#ef7a1a"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.55"
        />
        <text
          x={VIEW_W - PADDING.right - 2}
          y={targetY - 4}
          textAnchor="end"
          fontSize="9"
          fill="#ef7a1a"
          opacity="0.8"
          fontWeight="600"
        >
          alvo
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#goal-area-grad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#ef7a1a"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* First and last dots */}
        <circle
          cx={toX(0)}
          cy={toY(values[0] ?? 0)}
          r="3"
          fill="#ef7a1a"
          stroke="white"
          strokeWidth="1.5"
        />
        <circle
          cx={toX(sorted.length - 1)}
          cy={toY(values[values.length - 1] ?? 0)}
          r="3"
          fill="#ef7a1a"
          stroke="white"
          strokeWidth="1.5"
        />

        {/* Month labels */}
        <text
          x={toX(0)}
          y={VIEW_H - 4}
          textAnchor="start"
          fontSize="9"
          fill="var(--text-muted)"
        >
          {firstLabel}
        </text>
        <text
          x={toX(sorted.length - 1)}
          y={VIEW_H - 4}
          textAnchor="end"
          fontSize="9"
          fill="var(--text-muted)"
        >
          {lastLabel}
        </text>
      </svg>
    </div>
  );
}
