"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ProjectionPoint } from "../_lib/projection";

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function brlAxis(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface ChartDatum {
  month: number;
  liquido: number;
  imposto: number;
}

export function ProjectionChart({
  points,
  principalCents,
}: {
  points: ProjectionPoint[];
  principalCents: bigint;
}) {
  if (points.length < 2) return null;

  const last = points[points.length - 1]!;
  const hasTax = Number(last.taxCents) > 0;

  const data: ChartDatum[] = points.map((p) => ({
    month: p.month,
    liquido: Number(p.netYieldCents) / 100,
    imposto: Number(p.taxCents) / 100,
  }));

  return (
    <div>
      <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        Quanto rende, mês a mês (sobre {brl(principalCents)})
      </p>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-liquido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={(m: number) => `${m}m`}
              interval={2}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={brlAxis}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                name === "liquido" ? "Fica com você" : "Imposto",
              ]}
              labelFormatter={(m) => `Mês ${m}`}
              contentStyle={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="liquido"
              stroke="var(--color-brand-600)"
              strokeWidth={2}
              fill="url(#grad-liquido)"
            />
            <Area
              type="monotone"
              dataKey="imposto"
              stroke="var(--semantic-negative)"
              strokeWidth={2}
              fill="var(--semantic-negative)"
              fillOpacity={0.12}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-[color:var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[color:var(--color-brand-500)]" aria-hidden />
          Fica com você {brl(last.netYieldCents)}
        </span>
        {hasTax ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[color:var(--semantic-negative)]" aria-hidden />
            Imposto {brl(last.taxCents)}
          </span>
        ) : (
          <span className="text-[color:var(--text-muted)]">Isento de imposto</span>
        )}
      </div>
    </div>
  );
}
