"use client";

import { Clock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { HourlyRateService } from "@/domain/services/hourly-rate.service";

import { MoneyInput } from "../../../_components/money-input";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";
import { ResultCard } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";
import { buildIncomeSeedQuery } from "../../_lib/income-seed";

import { WorkBreakdownFields, type WorkBreakdownValue } from "./work-breakdown-fields";

const DEFAULT_HOURS = 40;

interface FormValues {
  netMonthlyCents: bigint;
  hoursPerWeek: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function HourlyRateClient({ prefill }: { prefill: { netMonthlyCents: string } }) {
  const [mode, setMode] = useState<"rate" | "reverse">("rate");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <WizardRadioCard
          active={mode === "rate"}
          onSelect={() => setMode("rate")}
          title="Valor da minha hora"
          description="Parto da renda mensal."
        />
        <WizardRadioCard
          active={mode === "reverse"}
          onSelect={() => setMode("reverse")}
          title="Quanto vou fazer no mês"
          description="Parto das diárias ou horas."
        />
      </div>

      {mode === "rate" ? (
        <RateMode prefill={prefill} />
      ) : (
        <ReverseMode />
      )}
    </div>
  );
}

function RateMode({ prefill }: { prefill: { netMonthlyCents: string } }) {
  const form = useForm<FormValues>({
    defaultValues: {
      netMonthlyCents: BigInt(prefill.netMonthlyCents),
      hoursPerWeek: DEFAULT_HOURS,
    },
  });

  const net = normalizeCents(useWatch({ control: form.control, name: "netMonthlyCents" }));
  const hoursPerWeek = useWatch({ control: form.control, name: "hoursPerWeek" }) ?? DEFAULT_HOURS;

  const result = useMemo(
    () => HourlyRateService.compute({ netMonthlyCents: net, hoursPerWeek }),
    [net, hoursPerWeek],
  );

  const hasIncome = net > 0n;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Seus dados
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="netMonthlyCents"
            label="Renda mensal"
            required
            helper="Quanto você recebe por mês. Puxado da sua renda."
          />
          <SimSlider
            label="Horas por semana"
            value={hoursPerWeek}
            min={1}
            max={60}
            step={1}
            displayValue={`${hoursPerWeek}h`}
            onChange={(v) => form.setValue("hoursPerWeek", v)}
          />
        </div>
      </section>

      {hasIncome ? (
        <>
          <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
                  Sua hora vale
                </span>
                <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
                  {brl(result.hourlyCents)}
                  <span className="ml-1 text-[0.875rem] font-semibold opacity-85">/hora</span>
                </div>
                <p className="mt-2 text-[0.75rem] font-medium text-white/85">
                  Use como régua: um freela ou hora extra vale a pena se pagar mais que isso.
                </p>
              </div>
              <Clock size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <ResultCard title="Por dia útil" subtitle="Renda ÷ 22 dias">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.perWorkdayCents)}
              </div>
            </ResultCard>
            <ResultCard title="Horas no mês" subtitle="Semanas convertidas (52/12)">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {result.monthlyHours.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}h
              </div>
            </ResultCard>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe sua renda mensal para ver quanto vale sua hora.
          </p>
        </section>
      )}
    </div>
  );
}

function ReverseMode() {
  const [work, setWork] = useState<WorkBreakdownValue | null>(null);

  const shiftCount =
    work?.breakdown.basis === "daily"
      ? work.breakdown.lines.reduce((sum, l) => sum + (Number(l.count) || 0), 0)
      : 0;

  const hasMonth = work != null && work.monthCents > 0n;

  const seedQuery = hasMonth
    ? buildIncomeSeedQuery({
        amountCents: work.monthCents.toString(),
        frequency: "monthly",
        label: work.breakdown.basis === "daily" ? "Diárias" : "Trabalho por hora",
        breakdownJson: JSON.stringify(work.breakdown),
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Seu trabalho
        </h2>
        <WorkBreakdownFields onChange={setWork} />
      </section>

      {hasMonth ? (
        <>
          <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
              Estimativa do mês
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
              {brl(work.monthCents)}
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              {work.breakdown.basis === "daily"
                ? `No ritmo de ${shiftCount} ${shiftCount === 1 ? "diária" : "diárias"}. Muda o número, muda o mês.`
                : "Pelas horas que você faz por semana. Muda o número, muda o mês."}
            </p>
            {work.hourlyCents != null ? (
              <p className="mt-1 text-[0.75rem] font-medium text-white/85">
                Rende cerca de {brl(work.hourlyCents)} por hora.
              </p>
            ) : null}
          </section>

          {seedQuery ? (
            <Link
              href={`/app/renda/nova?${seedQuery}` as Route}
              className="focus-ring flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
            >
              Salvar como minha renda
            </Link>
          ) : null}
        </>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe o trabalho para ver a estimativa do mês.
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
