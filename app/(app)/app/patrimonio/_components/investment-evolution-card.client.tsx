"use client";

import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";

import { fetchInvestmentEvolution } from "../_actions/investment-evolution-query";

const TYPE_LABEL: Record<string, string> = {
  crypto: "Cripto",
  stocks: "Ações",
  fund: "Fundos imobiliários",
  fixed_income: "Renda fixa",
  other: "Outros",
};

const TYPE_COLOR: Record<string, string> = {
  crypto: "var(--color-brand-500)",
  stocks: "var(--color-brand-700)",
  fund: "var(--semantic-positive)",
  fixed_income: "var(--color-brand-300)",
  other: "var(--text-muted)",
};

function brlAxis(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function InvestmentEvolutionCard() {
  const { data } = useQuery({
    queryKey: ["investment-evolution"],
    queryFn: () => fetchInvestmentEvolution(),
  });

  if (!data || data.types.length === 0) return null;

  const labelFor = (t: string) => TYPE_LABEL[t] ?? t;
  const colorFor = (t: string) => TYPE_COLOR[t] ?? "var(--text-muted)";

  const chartData = data.months.map((m) => {
    const row: Record<string, number | string> = { month: m.month.slice(5) };
    for (const t of data.types) row[t] = Number(m.byType[t] ?? "0") / 100;
    return row;
  });

  const enoughHistory = data.months.length >= 2;

  const latest = data.months[data.months.length - 1];
  const fmtBrl = (reais: number) =>
    reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const rows = data.types.map((t) => ({
    type: t,
    reais: Number(latest?.byType[t] ?? "0") / 100,
  }));
  const totalReais = rows.reduce((sum, r) => sum + r.reais, 0);

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
        Onde está seu dinheiro investido
      </h2>

      {enoughHistory ? (
        <div className="mt-3 h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
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
                  labelFor(String(name)),
                ]}
                contentStyle={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              {data.types.map((t) => (
                <Area
                  key={t}
                  type="monotone"
                  dataKey={t}
                  stackId="1"
                  stroke={colorFor(t)}
                  fill={colorFor(t)}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-1.5 text-[0.8125rem]">
        {rows.map((r) => (
          <div key={r.type} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[color:var(--text-secondary)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colorFor(r.type) }}
                aria-hidden
              />
              {labelFor(r.type)}
            </span>
            <span className="font-semibold text-[color:var(--text-primary)]">
              <HideableValue>{fmtBrl(r.reais)}</HideableValue>
            </span>
          </div>
        ))}
        {rows.length > 1 ? (
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-[color:var(--border-soft)] pt-1.5">
            <span className="text-[color:var(--text-secondary)]">Total</span>
            <span className="font-bold text-[color:var(--text-primary)]">
              <HideableValue>{fmtBrl(totalReais)}</HideableValue>
            </span>
          </div>
        ) : null}
      </div>

      {!enoughHistory ? (
        <p className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">
          A evolução por mês aparece aqui quando você tiver o segundo registro.
        </p>
      ) : null}
    </section>
  );
}
