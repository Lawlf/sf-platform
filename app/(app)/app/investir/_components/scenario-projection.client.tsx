"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { compoundProjection } from "../_lib/compound";
import type { GrowthKind } from "../_lib/options";

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function brlAxis(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const YEAR_OPTIONS = [1, 5, 10, 20];

interface KindConfig {
  rateLabel: string;
  rateDefault: number;
  hasDividends: boolean;
  reference: string;
}

const CONFIG: Record<GrowthKind, KindConfig> = {
  yield: {
    rateLabel: "Rende por ano",
    rateDefault: 8,
    hasDividends: false,
    reference: "",
  },
  appreciation: {
    rateLabel: "Valoriza por ano (média)",
    rateDefault: 8,
    hasDividends: false,
    reference:
      "Referência: fundo é nome para coisas muito diferentes, de conservador a agressivo, então não tem uma faixa única. Confira o histórico daquele fundo antes de chutar a taxa.",
  },
  appreciation_dividends: {
    rateLabel: "Valoriza por ano",
    rateDefault: 7,
    hasDividends: true,
    reference:
      "Referência: no longo prazo a bolsa costuma render acima da renda fixa, mas oscila muito e já caiu 40% ou mais em crises. Ainda pode pagar dividendos por cima. Passado não garante o futuro.",
  },
  speculative: {
    rateLabel: "Se valorizar por ano",
    rateDefault: 12,
    hasDividends: false,
    reference:
      "Referência: cripto não tem média confiável. Já multiplicou em pouco tempo e já caiu mais de 80% no mesmo ciclo. Qualquer número aqui é chute, não projeção.",
  },
};

export function ScenarioProjection({
  amountCents,
  growthKind,
  cdiAnnualPct,
}: {
  amountCents: bigint;
  growthKind: GrowthKind;
  cdiAnnualPct: number;
}) {
  const cfg = CONFIG[growthKind];
  const [ratePct, setRatePct] = useState(
    growthKind === "yield" ? Math.round(cdiAnnualPct) : cfg.rateDefault,
  );
  const [divPct, setDivPct] = useState(5);
  const [years, setYears] = useState(10);

  const reference =
    growthKind === "yield"
      ? `Referência: títulos de renda fixa costumam render perto do CDI de hoje (${cdiAnnualPct.toLocaleString("pt-BR")}% ao ano). Muda quando a Selic muda.`
      : cfg.reference;

  const totalRate = cfg.hasDividends ? ratePct + divPct : ratePct;

  const projection = useMemo(
    () => compoundProjection({ amountCents, annualRatePct: totalRate, years }),
    [amountCents, totalRate, years],
  );

  const data = projection.points.map((p) => ({ year: p.year, valor: Number(p.valueCents) / 100 }));
  const anosLabel = years === 1 ? "ano" : "anos";

  const sentence = cfg.hasDividends
    ? `Valorizando ${ratePct.toLocaleString("pt-BR")}% e pagando ${divPct.toLocaleString("pt-BR")}% de dividendos ao ano, em ${years} ${anosLabel} teria`
    : growthKind === "yield"
      ? `Rendendo ${ratePct.toLocaleString("pt-BR")}% ao ano, em ${years} ${anosLabel} viraria`
      : growthKind === "speculative"
        ? `Se valorizar ${ratePct.toLocaleString("pt-BR")}% ao ano (puro chute), em ${years} ${anosLabel} teria`
        : `Valorizando ${ratePct.toLocaleString("pt-BR")}% ao ano na média, em ${years} ${anosLabel} teria`;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        Simule um cenário
      </h3>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <RateInput label={cfg.rateLabel} value={ratePct} onChange={setRatePct} />
          {cfg.hasDividends ? (
            <RateInput label="Dividendos por ano" value={divPct} onChange={setDivPct} />
          ) : null}
        </div>

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
        {sentence}{" "}
        <span className="font-bold text-[color:var(--color-brand-800)]">{brl(projection.finalCents)}</span>.
      </p>
      <p className="mt-2 text-[0.625rem] leading-relaxed text-[color:var(--text-muted)]">{reference}</p>
    </section>
  );
}

function RateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </span>
      <span className="inline-flex w-fit items-center gap-0.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="w-10 bg-transparent text-right text-[0.9375rem] font-bold text-[color:var(--text-primary)] outline-none"
        />
        <span className="text-[0.875rem] font-semibold text-[color:var(--text-muted)]">%</span>
      </span>
    </label>
  );
}
