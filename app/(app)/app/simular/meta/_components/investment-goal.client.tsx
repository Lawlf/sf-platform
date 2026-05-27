"use client";

import { PartyPopper, Target } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { InvestmentGoalService } from "@/domain/services/investment-goal.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard, ResultStat } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_RATE = 10;
const DEFAULT_YEARS = 10;

interface FormValues {
  targetCents: bigint;
  initialCents: bigint;
  annualRatePct: number;
  years: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function InvestmentGoalClient({ prefill }: { prefill: { initialCents: string } }) {
  const form = useForm<FormValues>({
    defaultValues: {
      targetCents: 0n as unknown as bigint,
      initialCents: BigInt(prefill.initialCents),
      annualRatePct: DEFAULT_RATE,
      years: DEFAULT_YEARS,
    },
  });

  const target = normalizeCents(useWatch({ control: form.control, name: "targetCents" }));
  const initial = normalizeCents(useWatch({ control: form.control, name: "initialCents" }));
  const annualRatePct = useWatch({ control: form.control, name: "annualRatePct" }) ?? DEFAULT_RATE;
  const years = useWatch({ control: form.control, name: "years" }) ?? DEFAULT_YEARS;

  const result = useMemo(
    () =>
      InvestmentGoalService.compute({
        targetCents: target,
        initialCents: initial,
        annualRatePct,
        years,
      }),
    [target, initial, annualRatePct, years],
  );

  const hasGoal = target > 0n;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Sua meta
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="targetCents"
            label="Quanto quer juntar"
            required
            helper="O patrimônio que você quer ter no fim."
          />
          <MoneyInput
            control={form.control}
            name="initialCents"
            label="Já tem investido"
            helper="Puxado do seu patrimônio; ajuste se quiser."
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
            label="Prazo"
            value={years}
            min={1}
            max={40}
            step={1}
            displayValue={`${years} ${years === 1 ? "ano" : "anos"}`}
            onChange={(v) => form.setValue("years", v)}
          />
        </div>
      </section>

      {hasGoal ? (
        result.alreadyReached ? (
          <section className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] p-4 text-white shadow-[0_14px_32px_rgba(22,163,74,0.30)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
                  Boa notícia
                </span>
                <div className="mt-1 text-[1.5rem] font-extrabold leading-tight md:text-[1.75rem]">
                  Você já chega lá!
                </div>
                <p className="mt-2 text-[0.75rem] font-medium text-white/85">
                  Só com o que já tem investido, no prazo e rendimento informados, a meta é atingida
                  sem novos aportes.
                </p>
              </div>
              <PartyPopper size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
                    Aporte necessário
                  </span>
                  <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
                    {brl(result.requiredMonthlyCents)}
                    <span className="ml-1 text-[0.875rem] font-semibold opacity-85">/mês</span>
                  </div>
                  <p className="mt-2 text-[0.75rem] font-medium text-white/85">
                    Por {years} {years === 1 ? "ano" : "anos"} para juntar {brl(target)}.
                  </p>
                </div>
                <Target size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
              </div>
            </section>
            <section className="grid gap-3 sm:grid-cols-2">
              <ResultCard title="Você vai aportar" subtitle="Soma dos depósitos">
                <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                  {brl(result.totalContributedCents)}
                </div>
              </ResultCard>
              <ResultCard title="Rende sozinho" subtitle="Juro sobre juro">
                <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--semantic-positive)]">
                  {brl(result.totalInterestCents)}
                </div>
                <ResultStat label="Da meta" value={brl(target)} />
              </ResultCard>
            </section>
          </>
        )
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe quanto você quer juntar para ver o aporte mensal.
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
