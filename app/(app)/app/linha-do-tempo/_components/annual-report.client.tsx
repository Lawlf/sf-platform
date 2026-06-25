"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ChevronDown, Crown, Lock, PlusCircle, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  fetchAnnualReport,
  type AnnualReportPayload,
} from "../../_actions/planning-queries";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { useMoneyVisibility } from "../../_components/money-visibility/money-visibility-provider.client";

interface Props {
  initialData: AnnualReportPayload;
}

const CONSUMO_ROWS = [
  { key: "essencial", label: "Essencial" },
  { key: "parcelado", label: "Parcelado" },
  { key: "resto", label: "Resto" },
] as const;

const PIE_COLORS = [
  "#ef7a1a",
  "#f0a04b",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#94a3b8",
];

function barHeightPct(value: bigint, max: bigint): number {
  if (max <= 0n) return 0;
  const v = Number(value);
  const m = Number(max);
  if (!Number.isFinite(v) || !Number.isFinite(m) || m === 0) return 0;
  const pct = (v / m) * 100;
  return Math.min(100, Math.max(0, pct));
}

function pctOf(part: string, total: string): number {
  const p = Number(part);
  const t = Number(total);
  if (!Number.isFinite(p) || !Number.isFinite(t) || t === 0) return 0;
  return Math.min(100, Math.max(0, (p / t) * 100));
}

function FreeLock() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 opacity-60 backdrop-blur-xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-3)]">
          <Lock size={18} strokeWidth={1.75} className="text-[color:var(--text-muted)]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              Relatório do ano
            </span>
            <Lock size={12} strokeWidth={2.25} className="text-[color:var(--text-muted)]" aria-hidden />
          </div>
          <span className="mt-0.5 block text-[0.6875rem] text-[color:var(--text-muted)]">
            Veja pra onde seu dinheiro foi no ano com o Pro.
          </span>
        </div>
      </div>
      <Link
        href={"/app/configuracoes/planos" as Route}
        className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
      >
        Virar Pro
        <Crown size={14} strokeWidth={2.25} aria-hidden />
      </Link>
    </section>
  );
}

function EmptyReport() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Sparkles size={28} strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <h3 className="text-base font-bold text-[color:var(--text-primary)]">
            Quer ver pra onde foi o dinheiro do ano?
          </h3>
          <p className="mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">
            É opcional. Se quiser enxergar o ano no macro, registre um gasto pela IA ou na mão, ou
            importe seu extrato.
          </p>
        </div>
        <Link
          href={"/app/lancar" as Route}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)] backdrop-blur transition-colors hover:bg-[color:var(--surface-2)]"
        >
          <PlusCircle size={16} strokeWidth={2} aria-hidden />
          Entrada ou saída
        </Link>
      </div>
    </section>
  );
}

function OnlyTransfersReport({ count }: { count: number }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[color:var(--border-soft)] px-6 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
          <ArrowLeftRight size={26} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h3 className="text-base font-bold text-[color:var(--text-primary)]">
            Nenhum gasto neste ano, só movimentação
          </h3>
          <p className="mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">
            Importamos {count} {count === 1 ? "movimentação" : "movimentações"} da sua conta, mas
            todas foram transferência, reserva (RDB/caixinha) ou dinheiro que entrou. Nada disso é
            gasto, então o relatório fica vazio.
          </p>
        </div>
        <Link
          href={"/app/lancar" as Route}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)] backdrop-blur transition-colors hover:bg-[color:var(--surface-2)]"
        >
          <PlusCircle size={16} strokeWidth={2} aria-hidden />
          Registrar um gasto
        </Link>
      </div>
    </section>
  );
}

function ConsumoBreakdown({ data }: { data: AnnualReportPayload }) {
  const { consumo, totalFormatted } = data;
  const rowValue: Record<string, { cents: string; formatted: string }> = {
    essencial: { cents: consumo.essencialCents, formatted: consumo.essencialFormatted },
    parcelado: { cents: consumo.parceladoCents, formatted: consumo.parceladoFormatted },
    resto: { cents: consumo.restoCents, formatted: consumo.restoFormatted },
  };
  const totalCents = (
    BigInt(consumo.essencialCents) +
    BigInt(consumo.parceladoCents) +
    BigInt(consumo.restoCents)
  ).toString();

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--color-brand-800)]">
        Total no ano
      </span>
      <div className="mt-1 text-[1.625rem] font-extrabold leading-none tracking-[-0.6px] text-[color:var(--text-primary)]">
        <HideableValue>{totalFormatted}</HideableValue>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {CONSUMO_ROWS.map((row) => {
          const v = rowValue[row.key]!;
          const pct = pctOf(v.cents, totalCents);
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between text-[0.8125rem]">
                <span className="font-semibold text-[color:var(--text-primary)]">{row.label}</span>
                <span className="font-semibold text-[color:var(--text-primary)]">
                  <HideableValue>{v.formatted}</HideableValue>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]">
                <div
                  aria-hidden
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f28e25,#ef7a1a)] transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[0.6875rem] text-[color:var(--text-muted)]">
        Transferências entre suas contas não entram aqui.
      </p>
    </section>
  );
}

function PieTooltip({
  active,
  payload,
  hidden,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: { formatted: string } }[];
  hidden: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0];
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1.5 text-[0.75rem] shadow-sm">
      <span className="text-[color:var(--text-muted)]">{datum?.name} </span>
      <span className="font-semibold text-[color:var(--text-primary)]">
        {hidden ? "R$ •••" : datum?.payload?.formatted}
      </span>
    </div>
  );
}

function CategoryDetail({ data }: { data: AnnualReportPayload }) {
  const [open, setOpen] = useState(false);
  const { hidden } = useMoneyVisibility();

  if (data.byCategory.length === 0) return null;

  const pieData = data.byCategory.map((c) => ({
    name: c.label,
    value: Number(c.totalCents),
    formatted: c.totalFormatted,
  }));

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center gap-2 px-5 py-3.5 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
      >
        <span className="flex-1 text-left">Ver detalhado por categoria</span>
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          aria-hidden
          className={`shrink-0 text-[color:var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-[color:var(--border-soft)] px-5 pb-5 pt-4">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={1}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]!} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip hidden={hidden} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 flex flex-col divide-y divide-[color:var(--border-soft)]">
            {data.byCategory.map((c, i) => (
              <li key={c.label} className="flex items-center gap-3 py-2.5">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length]! }}
                />
                <span className="min-w-0 flex-1 truncate text-[0.875rem] text-[color:var(--text-primary)]">
                  {c.label}
                </span>
                <span className="shrink-0 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  <HideableValue>{c.totalFormatted}</HideableValue>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[0.6875rem] text-[color:var(--text-muted)]">
            Categorias estimadas pela descrição do gasto. Aproximação, não classificação contábil.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function AnnualReport({ initialData }: Props) {
  const { data } = useSuspenseQuery({
    queryKey: ["annual-report"],
    queryFn: fetchAnnualReport,
    initialData,
  });

  if (!data.isPro) return <FreeLock />;
  if (!data.hasData) {
    return data.excludedMovements > 0 ? (
      <OnlyTransfersReport count={data.excludedMovements} />
    ) : (
      <EmptyReport />
    );
  }

  const maxMonth = data.byMonth.reduce((max, m) => {
    const c = BigInt(m.totalCents);
    return c > max ? c : max;
  }, 0n);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--color-brand-800)]">
          Gasto mês a mês em {data.year}
        </span>
        <div className="mt-5 flex items-end justify-between gap-1.5">
          {data.byMonth.map((m) => {
            const h = barHeightPct(BigInt(m.totalCents), maxMonth);
            return (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end justify-center">
                  <div
                    aria-hidden
                    className="w-full max-w-[1.25rem] rounded-t-md bg-[linear-gradient(180deg,#f28e25,#ef7a1a)] transition-[height] duration-500"
                    style={{ height: `${Math.max(h, h > 0 ? 6 : 2)}%` }}
                  />
                </div>
                <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.3px] text-[color:var(--text-muted)]">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <ConsumoBreakdown data={data} />

      <CategoryDetail data={data} />

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
        <Link
          href={"/app/lancar" as Route}
          className="focus-ring inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
        >
          <PlusCircle size={16} strokeWidth={2} aria-hidden />
          Entrada ou saída
        </Link>
      </section>
    </div>
  );
}
