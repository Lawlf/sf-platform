"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { compoundProjection } from "../_lib/compound";

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function brlAxis(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const YEAR_OPTIONS = [1, 5, 10, 20];

export function ScenarioProjection({ amountCents }: { amountCents: bigint }) {
  const [ratePct, setRatePct] = useState(8);
  const [years, setYears] = useState(10);

  const projection = useMemo(
    () => compoundProjection({ amountCents, annualRatePct: ratePct, years }),
    [amountCents, ratePct, years],
  );

  const data = projection.points.map((p) => ({ year: p.year, valor: Number(p.valueCents) / 100 }));

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        Simule um cenário
      </h3>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Rende por ano
          </span>
          <span className="flex items-center gap-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.5}
              value={ratePct}
              onChange={(e) => setRatePct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-12 bg-transparent text-[0.9375rem] font-bold text-[color:var(--text-primary)] outline-none"
            />
            <span className="text-[0.875rem] font-semibold text-[color:var(--text-muted)]">%</span>
          </span>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Por quanto tempo
          </span>
          <div className="flex gap-1 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-1">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                aria-pressed={years === y}
                className={`focus-ring rounded-full px-3 py-1.5 text-[0.75rem] font-bold transition-colors ${
                  years === y ? "text-white" : "text-[color:var(--text-secondary)]"
                }`}
                style={years === y ? { background: "linear-gradient(135deg, #f28e25, #ef7a1a)" } : undefined}
              >
                {y}a
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-cenario" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={(y: number) => (y === 0 ? "hoje" : `${y}a`)}
            />
            <YAxis
              width={48}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={brlAxis}
            />
            <Tooltip
              formatter={(value) => [
                Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                "Valor",
              ]}
              labelFormatter={(y) => (y === 0 ? "Hoje" : `Em ${y} anos`)}
              contentStyle={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="var(--color-brand-600)"
              strokeWidth={2}
              fill="url(#grad-cenario)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
        Rendendo {ratePct.toLocaleString("pt-BR")}% ao ano, em {years}{" "}
        {years === 1 ? "ano" : "anos"} viraria{" "}
        <span className="font-bold text-[color:var(--color-brand-800)]">{brl(projection.finalCents)}</span>.
      </p>
      <p className="mt-2 text-[0.625rem] leading-relaxed text-[color:var(--text-muted)]">
        Isto é uma hipótese pra você simular, não uma promessa. Renda variável oscila e pode perder
        valor; rendimento passado não garante o futuro.
      </p>
    </section>
  );
}
