"use client";

import { Clock } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { HourlyRateService } from "@/domain/services/hourly-rate.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_HOURS = 40;

interface FormValues {
  netMonthlyCents: bigint;
  hoursPerWeek: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function HourlyRateClient({ prefill }: { prefill: { netMonthlyCents: string } }) {
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
