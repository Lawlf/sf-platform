"use client";

import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { EarlyWithdrawalSample } from "../_lib/projection";

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function brlAxis(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

export function EarlyWithdrawalChart({ series }: { series: EarlyWithdrawalSample[] }) {
  if (series.length < 2) return null;

  const data = series.map((s) => ({
    day: s.day,
    rendeu: Number(s.grossCents) / 100,
    leva: Number(s.netCents) / 100,
  }));
  const last = series[series.length - 1]!;
  const ariaLabel = `Quanto você leva ao sacar em cada dia, já com IOF e imposto. No dia 30, sem IOF, leva ${brl(last.netCents)}.`;

  return (
    <div>
      <p className="text-[0.8125rem] leading-snug text-[color:var(--text-secondary)]">
        Se sacar antes de 30 dias, o IOF come o que rendeu, começando quase total e zerando no dia
        30. Veja quanto você levaria sacando em cada dia.
      </p>
      <div className="mt-3 h-40 w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-leva" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.12} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={(d: number) => `${d}d`}
              ticks={[1, 10, 20, 30]}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={brlAxis}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                name === "leva" ? "Você leva" : "Rendeu",
              ]}
              labelFormatter={(d) => `Sacar no dia ${d}`}
              contentStyle={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="rendeu"
              stroke="var(--text-muted)"
              strokeWidth={1.25}
              strokeDasharray="3 3"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="leva"
              stroke="var(--color-brand-600)"
              strokeWidth={2}
              fill="url(#grad-leva)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Quanto você leva sacando em cada dia</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Rendeu</th>
            <th>Você leva</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.day}>
              <td>{s.day}</td>
              <td>{brl(s.grossCents)}</td>
              <td>{brl(s.netCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-[color:var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[color:var(--color-brand-500)]" aria-hidden />
          Você leva (já com IOF e imposto)
        </span>
        <span className="inline-flex items-center gap-1.5 text-[color:var(--text-muted)]">
          No dia 30 sem IOF: leva {brl(last.netCents)}
        </span>
      </div>
    </div>
  );
}
