"use client";

import type { SerializedProjectionPoint } from "../_actions/planning-queries";

interface ProjectionCurveProps {
  points: SerializedProjectionPoint[];
  futureFromMonth?: number;
}

function fmtCompactBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function fmtMonthLabel(month: number): string {
  if (month >= 12 && month % 12 === 0) {
    const years = month / 12;
    return years === 1 ? "1 ano" : `${years} anos`;
  }
  return `mês ${month}`;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 8 };
const VIEW_W = 400;
const VIEW_H = 160;

export function ProjectionCurve({ points }: ProjectionCurveProps) {
  if (points.length === 0) {
    return (
      <p className="text-center text-[0.8125rem] text-[color:var(--text-muted)]">
        Sem projeção ainda.
      </p>
    );
  }

  if (points.length === 1) {
    const only = points[0]!;
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          {fmtMonthLabel(only.month)}
        </span>
        <span className="text-[1rem] font-bold text-[color:var(--text-primary)]">
          {fmtCompactBrl(Number(BigInt(only.netWorthCents)) / 100)}
        </span>
      </div>
    );
  }

  const chartW = VIEW_W - PADDING.left - PADDING.right;
  const chartH = VIEW_H - PADDING.top - PADDING.bottom;

  const values: number[] = points.map((p) => Number(BigInt(p.netWorthCents)));
  const minV = Math.min(0, ...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;

  function toX(i: number): number {
    return PADDING.left + (i / (points.length - 1)) * chartW;
  }

  function toY(v: number): number {
    return PADDING.top + chartH - ((v - minV) / rangeV) * chartH;
  }

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");

  const areaPath =
    linePath +
    ` L${toX(points.length - 1)},${PADDING.top + chartH} L${toX(0)},${PADDING.top + chartH} Z`;

  const firstMonth = points[0]!.month;
  const lastMonth = points[points.length - 1]!.month;
  const lastValue = values[values.length - 1]!;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-[96px] w-full overflow-hidden md:h-[120px]">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          aria-label="Projeção do patrimônio no ritmo atual"
          className="block h-full w-full"
        >
          <defs>
            <linearGradient id="projection-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef7a1a" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#ef7a1a" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#projection-area-grad)" />

          <path
            d={linePath}
            fill="none"
            stroke="#ef7a1a"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          <circle
            cx={toX(points.length - 1)}
            cy={toY(lastValue)}
            r="3"
            fill="#ef7a1a"
            stroke="white"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="flex items-center justify-between text-[0.625rem] text-[color:var(--text-muted)]">
        <span>{fmtMonthLabel(firstMonth)}</span>
        <span>{fmtMonthLabel(lastMonth)}</span>
      </div>
    </div>
  );
}
