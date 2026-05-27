"use client";

import { Activity } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { EbitdaService, type EbitdaZone } from "@/domain/services/ebitda.service";

import { MoneyInput } from "../../../_components/money-input";
import { BreakdownLine } from "../../_components/sim-result";

interface FormValues {
  revenueCents: bigint;
  cogsCents: bigint;
  opexCents: bigint;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ZONE_META: Record<
  EbitdaZone,
  { label: string; gradient: string; valueColor: string }
> = {
  negativa: {
    label: "Operação no vermelho",
    gradient: "bg-[linear-gradient(135deg,#dc2626,#ef4444)] shadow-[0_14px_32px_rgba(220,38,38,0.30)]",
    valueColor: "text-[color:var(--semantic-negative)]",
  },
  apertada: {
    label: "Margem apertada",
    gradient: "bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] shadow-[0_14px_32px_rgba(239,122,26,0.30)]",
    valueColor: "text-[color:var(--semantic-warning)]",
  },
  saudavel: {
    label: "Margem saudável",
    gradient: "bg-[linear-gradient(135deg,#16a34a,#22c55e)] shadow-[0_14px_32px_rgba(22,163,74,0.30)]",
    valueColor: "text-[color:var(--semantic-positive)]",
  },
  otima: {
    label: "Margem ótima",
    gradient: "bg-[linear-gradient(135deg,#16a34a,#22c55e)] shadow-[0_14px_32px_rgba(22,163,74,0.30)]",
    valueColor: "text-[color:var(--semantic-positive)]",
  },
};

export function EbitdaClient() {
  const form = useForm<FormValues>({
    defaultValues: {
      revenueCents: 0n as unknown as bigint,
      cogsCents: 0n as unknown as bigint,
      opexCents: 0n as unknown as bigint,
    },
  });

  const revenue = normalizeCents(useWatch({ control: form.control, name: "revenueCents" }));
  const cogs = normalizeCents(useWatch({ control: form.control, name: "cogsCents" }));
  const opex = normalizeCents(useWatch({ control: form.control, name: "opexCents" }));

  const result = useMemo(
    () => EbitdaService.compute({ revenueCents: revenue, cogsCents: cogs, opexCents: opex }),
    [revenue, cogs, opex],
  );

  const hasRevenue = revenue > 0n;
  const zone = ZONE_META[result.zone];

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Sua operação no mês
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="revenueCents"
            label="Receita (faturamento)"
            required
            helper="Tudo que entrou de vendas/serviços."
          />
          <MoneyInput
            control={form.control}
            name="cogsCents"
            label="Custos diretos"
            helper="Produtos, insumos, matéria-prima."
          />
          <MoneyInput
            control={form.control}
            name="opexCents"
            label="Despesas operacionais"
            helper="Aluguel, ferramentas, marketing, etc."
          />
        </div>
      </section>

      {hasRevenue ? (
        <>
          <section className={`rounded-2xl p-4 text-white ${zone.gradient}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
                  EBITDA · {zone.label}
                </span>
                <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
                  {brl(result.ebitdaCents)}
                </div>
                <p className="mt-2 text-[0.75rem] font-medium text-white/85">
                  Margem EBITDA de{" "}
                  {result.ebitdaMarginPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da
                  receita.
                </p>
              </div>
              <Activity size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
            </div>
          </section>

          <section className="glass-light p-4">
            <div className="flex flex-col">
              <BreakdownLine label="Receita" value={brl(revenue)} />
              <BreakdownLine label="Custos diretos" value={`- ${brl(cogs)}`} tone="negative" />
              <BreakdownLine
                label="Despesas operacionais"
                value={`- ${brl(opex)}`}
                tone="negative"
              />
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-[color:var(--border-soft)] pt-2">
                <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                  EBITDA
                </span>
                <span className={`text-[0.9375rem] font-extrabold ${zone.valueColor}`}>
                  {brl(result.ebitdaCents)}
                </span>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe a receita para calcular o EBITDA.
          </p>
        </section>
      )}

      <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
        EBITDA não considera juros, impostos, depreciação e amortização. Mede a geração de caixa da
        operação, não o lucro final no seu bolso.
      </p>
    </div>
  );
}

function normalizeCents(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.round(value));
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}
