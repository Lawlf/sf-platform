"use client";

import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface UnifiedPoint {
  monthIso: string;
  netWorthCents: string;
}

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function shortMonth(iso: string): string {
  const [y, m] = iso.split("-");
  const name = MONTH_NAMES[Number(m) - 1] ?? "";
  return `${name} ${y}`;
}

function brl0(reais: number): string {
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

interface Row {
  iso: string;
  past: number | null;
  future: number | null;
}

function UnifiedTooltip({
  active,
  payload,
  hidden,
}: {
  active?: boolean;
  payload?: { value?: number; dataKey?: string; payload?: Row }[];
  hidden: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload.find((p) => typeof p.value === "number") ?? payload[0];
  const iso = datum?.payload?.iso ?? "";
  const value = typeof datum?.value === "number" ? datum.value : 0;
  const isFuture = datum?.dataKey === "future";
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1.5 text-[0.75rem] shadow-sm">
      <div className="text-[color:var(--text-muted)]">
        {shortMonth(iso)}
        {isFuture ? " · no ritmo atual" : ""}
      </div>
      <div className="font-semibold text-[color:var(--text-primary)]">
        {hidden ? "R$ •••" : brl0(value)}
      </div>
    </div>
  );
}

export function UnifiedTrajectoryChart({
  past,
  future,
  hidden,
}: {
  past: UnifiedPoint[];
  future: UnifiedPoint[];
  hidden: boolean;
}) {
  const hasFuture = future.length > 0;

  const pastRows: Row[] = past.map((p) => ({
    iso: p.monthIso,
    past: Number(p.netWorthCents) / 100,
    future: null,
  }));

  // Junction: the last known month carries both series so the dashed future
  // line starts exactly where the solid past line ends.
  const todayIso = past.length > 0 ? past[past.length - 1]!.monthIso : null;
  if (hasFuture && pastRows.length > 0) {
    pastRows[pastRows.length - 1]!.future = pastRows[pastRows.length - 1]!.past;
  }

  const futureRows: Row[] = future.map((f) => ({
    iso: f.monthIso,
    past: null,
    future: Number(f.netWorthCents) / 100,
  }));

  const data = [...pastRows, ...futureRows];

  const values = data
    .flatMap((d) => [d.past, d.future])
    .filter((v): v is number => v !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) || 1;
  const domainMin = min - span * 0.08;
  const domainMax = max + span * 0.08;

  const firstIso = data[0]!.iso;
  const lastIso = data[data.length - 1]!.iso;
  const markToday = Boolean(todayIso) && hasFuture && past.length > 0;
  const ticks = markToday ? [firstIso, todayIso!, lastIso] : [firstIso, lastIso];

  const startReais = pastRows.length > 0 ? pastRows[0]!.past : null;
  const todayReais = pastRows.length > 0 ? pastRows[pastRows.length - 1]!.past : null;
  const projectedReais = futureRows.length > 0 ? futureRows[futureRows.length - 1]!.future : null;
  const fmtSummary = (v: number | null) =>
    v === null ? "sem dado" : hidden ? "R$ •••" : brl0(v);
  const ariaLabel = `Trajetória do patrimônio. Início ${fmtSummary(startReais)}, hoje ${fmtSummary(todayReais)}${hasFuture ? `, projetado no ritmo atual ${fmtSummary(projectedReais)}` : ""}.`;

  return (
    <>
    <div className="h-44 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="grad-past" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="grad-future" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="iso"
            ticks={ticks}
            tickFormatter={(iso: string) => (markToday && iso === todayIso ? "hoje" : shortMonth(iso))}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[domainMin, domainMax]} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={<UnifiedTooltip hidden={hidden} />}
          />
          {todayIso && hasFuture ? (
            <ReferenceLine
              x={todayIso}
              stroke="var(--border-strong)"
              strokeDasharray="3 3"
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="past"
            stroke="var(--color-brand-600)"
            strokeWidth={2}
            fill="url(#grad-past)"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="future"
            stroke="var(--color-brand-600)"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="url(#grad-future)"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <table className="sr-only">
      <caption>Patrimônio mês a mês</caption>
      <thead>
        <tr>
          <th>Mês</th>
          <th>Patrimônio</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => {
          const value = d.past ?? d.future ?? 0;
          const projected = d.past === null;
          return (
            <tr key={d.iso}>
              <td>{shortMonth(d.iso)}</td>
              <td>{hidden ? "R$ •••" : brl0(value)}</td>
              <td>{projected ? "projetado" : "realizado"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </>
  );
}
