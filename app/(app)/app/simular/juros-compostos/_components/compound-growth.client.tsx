"use client";

import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CompoundGrowthService } from "@/domain/services/compound-growth.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard, ResultStat } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";
import { SimToGoalCta } from "../../_components/sim-to-goal-cta";

const DEFAULT_RATE = 10; // % a.a. nominal (CDI aproximado).
const DEFAULT_YEARS = 10;

interface FormValues {
  initialCents: bigint;
  contributionCents: bigint;
  annualRatePct: number;
  years: number;
}

interface PrefillProps {
  prefill: { initialCents: string; contributionCents: string };
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CompoundGrowthClient({ prefill }: PrefillProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      initialCents: BigInt(prefill.initialCents),
      contributionCents: BigInt(prefill.contributionCents),
      annualRatePct: DEFAULT_RATE,
      years: DEFAULT_YEARS,
    },
  });

  const initial = normalizeCents(useWatch({ control: form.control, name: "initialCents" }));
  const contribution = normalizeCents(useWatch({ control: form.control, name: "contributionCents" }));
  const annualRatePct = useWatch({ control: form.control, name: "annualRatePct" }) ?? DEFAULT_RATE;
  const years = useWatch({ control: form.control, name: "years" }) ?? DEFAULT_YEARS;

  const result = useMemo(
    () =>
      CompoundGrowthService.simulate({
        initialCents: initial,
        monthlyContributionCents: contribution,
        annualRatePct,
        years,
      }),
    [initial, contribution, annualRatePct, years],
  );

  // Proporção juros vs aportado, para a barra de composição.
  const finalReais = Number(result.finalCents);
  const interestPct =
    finalReais > 0 ? Math.round((Number(result.totalInterestCents) / finalReais) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Sua simulação
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="initialCents"
            label="Valor inicial"
            helper="O que você já tem investido. Veio do seu patrimônio."
          />
          <MoneyInput
            control={form.control}
            name="contributionCents"
            label="Aporte mensal"
            helper="Quanto você investe por mês. Pré-preenchido com seu saldo da Carteira."
          />
          <SimSlider
            label="Rendimento esperado"
            value={annualRatePct}
            min={1}
            max={20}
            step={0.5}
            displayValue={`${annualRatePct}% ao ano`}
            onChange={(v) => form.setValue("annualRatePct", v)}
          />
          <SimSlider
            label="Por quanto tempo"
            value={years}
            min={1}
            max={40}
            step={1}
            displayValue={`${years} ${years === 1 ? "ano" : "anos"}`}
            onChange={(v) => form.setValue("years", v)}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
              Em {years} {years === 1 ? "ano" : "anos"} você terá
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-tight md:text-[1.875rem]">
              {brl(result.finalCents)}
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              {interestPct}% disso é juro sobre juro, sem você fazer nada.
            </p>
          </div>
          <TrendingUp size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
        </div>
      </section>

      <section className="glass-light p-4">
        <div
          className="flex h-3 overflow-hidden rounded-full bg-[color:var(--surface-2)]"
          role="img"
          aria-label={`${100 - interestPct}% investido por você, ${interestPct}% de rendimento`}
        >
          <div
            className="bg-[color:var(--color-brand-500)]"
            style={{ width: `${100 - interestPct}%` }}
          />
          <div className="bg-[color:var(--semantic-positive)]" style={{ width: `${interestPct}%` }} />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <ResultStat label="Você investiu" value={brl(result.totalInvestedCents)} />
          <ResultStat label="Rendeu sozinho" value={brl(result.totalInterestCents)} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ResultCard title="Total aportado" subtitle="Soma dos seus depósitos">
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            {brl(result.totalContributedCents)}
          </div>
        </ResultCard>
        <ResultCard title="Só de juros" subtitle="O trabalho do tempo">
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--semantic-positive)]">
            {brl(result.totalInterestCents)}
          </div>
        </ResultCard>
      </section>

      {result.finalCents > 0n ? (
        <SimToGoalCta
          seed={{
            type: "savings",
            targetCents: result.finalCents.toString(),
            savedCents: initial.toString(),
            deadlineIso: deadlineFromYears(years),
          }}
        />
      ) : null}
    </div>
  );
}

function deadlineFromYears(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
