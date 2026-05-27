"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FinancingComparisonService } from "@/domain/services/financing-comparison.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard, ResultHighlight, ResultStat } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_RATE = 11; // % a.a.
const DEFAULT_TERM = 360; // meses (imóvel)

interface FormValues {
  principalCents: bigint;
  annualRatePct: number;
  termMonths: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function termLabel(months: number): string {
  if (months % 12 === 0) {
    const y = months / 12;
    return `${months} meses (${y} ${y === 1 ? "ano" : "anos"})`;
  }
  return `${months} meses`;
}

export function FinancingComparisonClient() {
  const form = useForm<FormValues>({
    defaultValues: {
      principalCents: 0n as unknown as bigint,
      annualRatePct: DEFAULT_RATE,
      termMonths: DEFAULT_TERM,
    },
  });

  const principal = normalizeCents(useWatch({ control: form.control, name: "principalCents" }));
  const annualRatePct = useWatch({ control: form.control, name: "annualRatePct" }) ?? DEFAULT_RATE;
  const termMonths = useWatch({ control: form.control, name: "termMonths" }) ?? DEFAULT_TERM;

  const result = useMemo(
    () =>
      FinancingComparisonService.compare({
        principalCents: principal,
        annualRatePct,
        termMonths,
      }),
    [principal, annualRatePct, termMonths],
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Dados do financiamento
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="principalCents"
            label="Valor financiado"
            required
            helper="O valor que entra na dívida (não o da entrada)."
          />
          <SimSlider
            label="Taxa de juros"
            value={annualRatePct}
            min={1}
            max={30}
            step={0.5}
            displayValue={`${annualRatePct}% ao ano`}
            onChange={(v) => form.setValue("annualRatePct", v)}
          />
          <SimSlider
            label="Prazo"
            value={termMonths}
            min={12}
            max={420}
            step={12}
            displayValue={termLabel(termMonths)}
            onChange={(v) => form.setValue("termMonths", v)}
          />
        </div>
      </section>

      {result.ok ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <ResultCard title="Tabela Price" subtitle="Parcela fixa">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.price.firstInstallmentCents)}
              </div>
              <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">
                Mesma parcela do começo ao fim.
              </p>
              <ResultStat label="Total pago" value={brl(result.price.totalPaidCents)} />
              <ResultStat label="Total de juros" value={brl(result.price.totalInterestCents)} />
            </ResultCard>
            <ResultCard title="Tabela SAC" subtitle="Parcela decrescente">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.sac.firstInstallmentCents)}
              </div>
              <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">
                Começa aqui e cai até {brl(result.sac.lastInstallmentCents)}.
              </p>
              <ResultStat label="Total pago" value={brl(result.sac.totalPaidCents)} />
              <ResultStat label="Total de juros" value={brl(result.sac.totalInterestCents)} />
            </ResultCard>
          </section>

          <ResultHighlight>
            O SAC paga <strong>{brl(result.interestSavedBySacCents)}</strong> a menos de juros, mas a
            primeira parcela é mais alta. O Price tem parcela fixa, mais fácil de planejar.
          </ResultHighlight>
        </>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe o valor financiado para comparar Price e SAC.
          </p>
        </section>
      )}
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
