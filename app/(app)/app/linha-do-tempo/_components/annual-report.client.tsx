"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Crown, Lock, PlusCircle, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import {
  fetchAnnualReport,
  type AnnualReportPayload,
} from "../../_actions/planning-queries";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";

import { LogTransactionForm } from "./log-transaction-form.client";

interface Props {
  initialData: AnnualReportPayload;
}

function barHeightPct(value: bigint, max: bigint): number {
  if (max <= 0n) return 0;
  const v = Number(value);
  const m = Number(max);
  if (!Number.isFinite(v) || !Number.isFinite(m) || m === 0) return 0;
  const pct = (v / m) * 100;
  return Math.min(100, Math.max(0, pct));
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
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Sparkles size={28} strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <h3 className="text-base font-bold text-[color:var(--text-primary)]">
            Você ainda não detalhou nenhum gasto este ano
          </h3>
          <p className="mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">
            Detalhar é opcional. Você pode contar pela IA, tipo &ldquo;gastei 40 no café&rdquo;, ou
            registrar manualmente aqui pra ver pra onde foi.
          </p>
        </div>
        {open ? null : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)] backdrop-blur transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <PlusCircle size={16} strokeWidth={2} aria-hidden />
            Registrar gasto
          </button>
        )}
      </div>

      {open ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
          <LogTransactionForm />
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

  const [formOpen, setFormOpen] = useState(false);

  if (!data.isPro) return <FreeLock />;
  if (!data.hasData) return <EmptyReport />;

  const maxMonth = data.byMonth.reduce((max, m) => {
    const c = BigInt(m.totalCents);
    return c > max ? c : max;
  }, 0n);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--color-brand-800)]">
          Total detalhado em {data.year}
        </span>
        <div className="mt-1 text-[1.625rem] font-extrabold leading-none tracking-[-0.6px] text-[color:var(--text-primary)]">
          <HideableValue>{data.totalFormatted}</HideableValue>
        </div>

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

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--color-brand-800)]">
          Por categoria
        </span>
        <ul className="mt-3 flex flex-col divide-y divide-[color:var(--border-soft)]">
          {data.byCategory.map((c) => (
            <li
              key={c.category ?? "__none__"}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="min-w-0 truncate text-[0.875rem] text-[color:var(--text-primary)]">
                {c.label}
              </span>
              <span className="shrink-0 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                <HideableValue>{c.totalFormatted}</HideableValue>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5">
        {formOpen ? (
          <LogTransactionForm />
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="focus-ring inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
          >
            <PlusCircle size={16} strokeWidth={2} aria-hidden />
            Registrar gasto
          </button>
        )}
      </section>
    </div>
  );
}
