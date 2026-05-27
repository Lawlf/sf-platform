"use client";

import { PartyPopper, Rocket, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FinancialIndependenceService } from "@/domain/services/financial-independence.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard, ResultStat } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_REAL_RETURN = 4; // % a.a. acima da inflação (CDI real histórico ~4-5%).

interface FormValues {
  investedCents: bigint;
  contributionCents: bigint;
  costCents: bigint;
  realReturnPct: number;
}

interface PrefillProps {
  prefill: { investedCents: string; contributionCents: string; costCents: string };
}

function brl(cents: bigint): string {
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function freedomDateLabel(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function durationLabel(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? "mês" : "meses"}`);
  return parts.length > 0 ? parts.join(" e ") : "menos de 1 mês";
}

export function IndependenceSimulatorClient({ prefill }: PrefillProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      investedCents: BigInt(prefill.investedCents),
      contributionCents: BigInt(prefill.contributionCents),
      costCents: BigInt(prefill.costCents),
      realReturnPct: DEFAULT_REAL_RETURN,
    },
  });

  const invested = normalizeCents(useWatch({ control: form.control, name: "investedCents" }));
  const contribution = normalizeCents(useWatch({ control: form.control, name: "contributionCents" }));
  const cost = normalizeCents(useWatch({ control: form.control, name: "costCents" }));
  const realReturnPct = useWatch({ control: form.control, name: "realReturnPct" }) ?? DEFAULT_REAL_RETURN;

  const result = useMemo(
    () =>
      FinancialIndependenceService.simulate({
        currentInvestedCents: invested,
        monthlyContributionCents: contribution,
        monthlyCostOfLivingCents: cost,
        realAnnualReturnPct: realReturnPct,
      }),
    [invested, contribution, cost, realReturnPct],
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Seus números
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="investedCents"
            label="Patrimônio investido hoje"
            helper="Só o que rende (reservas + investimentos). Edite se quiser."
          />
          <MoneyInput
            control={form.control}
            name="contributionCents"
            label="Aporte mensal"
            helper="Quanto você investe por mês. Pré-preenchido com seu saldo livre."
          />
          <MoneyInput
            control={form.control}
            name="costCents"
            label="Custo de vida mensal na liberdade"
            helper="Quanto quer receber por mês sem trabalhar."
          />
          <SimSlider
            label="Rendimento real esperado"
            value={realReturnPct}
            min={1}
            max={10}
            step={0.5}
            displayValue={`${realReturnPct}% ao ano`}
            onChange={(v) => form.setValue("realReturnPct", v)}
          />
        </div>
      </section>

      <FreedomHero result={result} />

      <section className="grid gap-3 sm:grid-cols-2">
        <ResultCard title="Patrimônio-alvo" subtitle="O número mágico">
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            {brl(result.targetCents)}
          </div>
          <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">
            Renda passiva que cobre seu custo de vida para sempre.
          </p>
        </ResultCard>
        <ResultCard title="Patrimônio projetado" subtitle="Quando você chega lá">
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--semantic-positive)]">
            {brl(result.alreadyFree ? result.targetCents : result.projectedCents)}
          </div>
          <ResultStat label="Você aportou" value={brl(result.totalContributedCents)} />
          <ResultStat label="Rendeu sozinho" value={brl(result.totalGrowthCents)} />
        </ResultCard>
      </section>
    </div>
  );
}

function FreedomHero({
  result,
}: {
  result: ReturnType<typeof FinancialIndependenceService.simulate>;
}) {
  if (result.alreadyFree) {
    return (
      <section className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] p-4 text-white shadow-[0_14px_32px_rgba(22,163,74,0.30)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
              Liberdade financeira
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-tight md:text-[1.875rem]">
              Você já é livre!
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              Seu patrimônio já rende o suficiente pro seu custo de vida.
            </p>
          </div>
          <PartyPopper size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
        </div>
      </section>
    );
  }

  if (result.monthsToFreedom === null) {
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
              Liberdade financeira
            </span>
            <div className="mt-1 text-[1.375rem] font-extrabold leading-tight text-[color:var(--text-primary)]">
              Fora do horizonte
            </div>
            <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
              Com esses números, o alvo não é atingido em 100 anos. Aumente o aporte ou ajuste o
              custo de vida.
            </p>
          </div>
          <Sparkles size={32} strokeWidth={1.5} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
            Liberdade em
          </span>
          <div className="mt-1 text-[1.625rem] font-extrabold leading-tight md:text-[1.875rem]">
            {durationLabel(result.monthsToFreedom)}
          </div>
          <p className="mt-2 text-[0.75rem] font-medium text-white/85">
            Por volta de {freedomDateLabel(result.monthsToFreedom)}.
          </p>
        </div>
        <Rocket size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
      </div>
    </section>
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
