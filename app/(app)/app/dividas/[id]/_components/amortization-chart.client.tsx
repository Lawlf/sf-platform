"use client";

import { useEffect, useRef } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from "recharts";

export const ABATE_COLOR = "var(--color-brand-500)";
export const JURO_COLOR = "#9a8f7d";
export const PAID_COLOR = "var(--semantic-positive)";

const BAR_SLOT = 72;

export interface AmortizationChartRow {
  month: number;
  monthLabel: string;
  year: number;
  monthShort: string;
  paid: boolean;
  abate: number;
  juro: number;
  installmentLabel: string;
  abateLabel: string;
  juroLabel: string;
  remainingBalanceLabel: string;
}

interface Props {
  rows: AmortizationChartRow[];
  selectedMonth: number;
  onSelect: (month: number) => void;
}

export function AmortizationChart({ rows, selectedMonth, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerWidth = rows.length * BAR_SLOT;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = rows.findIndex((r) => r.month === selectedMonth);
    if (idx < 0) return;
    el.scrollTo({
      left: idx * BAR_SLOT - el.clientWidth / 2 + BAR_SLOT / 2,
      behavior: "smooth",
    });
  }, [selectedMonth, rows]);

  return (
    <div
      ref={scrollRef}
      className="-mx-1 overflow-x-auto overflow-y-hidden px-1 [&_*]:outline-none [&_.recharts-surface]:outline-none"
    >
      <div style={{ width: Math.max(innerWidth, 0) }} className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            barCategoryGap="22%"
          >
            <XAxis
              dataKey="month"
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={({ x, y, payload }) => {
                const isSel = payload.value === selectedMonth;
                return (
                  <text
                    x={Number(x)}
                    y={Number(y) + 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={isSel ? 700 : 400}
                    fill={isSel ? "var(--color-brand-700)" : "var(--text-muted)"}
                  >
                    {payload.value}
                  </text>
                );
              }}
            />
            <Bar
              dataKey="abate"
              stackId="a"
              fill={ABATE_COLOR}
              radius={[0, 0, 2, 2]}
              isAnimationActive={false}
              activeBar={false}
              onClick={(_, index) => onSelect(rows[index]?.month ?? selectedMonth)}
              className="cursor-pointer"
            >
              {rows.map((r) => (
                <Cell
                  key={r.month}
                  fill={r.paid ? PAID_COLOR : ABATE_COLOR}
                  fillOpacity={r.month === selectedMonth ? 1 : 0.4}
                />
              ))}
            </Bar>
            <Bar
              dataKey="juro"
              stackId="a"
              fill={JURO_COLOR}
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
              activeBar={false}
              onClick={(_, index) => onSelect(rows[index]?.month ?? selectedMonth)}
              className="cursor-pointer"
            >
              {rows.map((r) => (
                <Cell key={r.month} fillOpacity={r.month === selectedMonth ? 1 : 0.4} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Amortização mês a mês</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Abatido</th>
            <th>Juros</th>
            <th>Quanto falta</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <td>{r.monthLabel}</td>
              <td>{r.abateLabel}</td>
              <td>{r.juroLabel}</td>
              <td>{r.remainingBalanceLabel}</td>
              <td>{r.paid ? "Pago" : "A pagar"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
