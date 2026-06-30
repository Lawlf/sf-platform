"use client";

import { useId, useMemo, useState } from "react";

import {
  InterestRateConverterService,
  type RateInputPeriod,
} from "@/domain/services/interest-rate-converter.service";

import { wizardInputClass } from "@/ui/wizard-field";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";
import { ResultCard } from "../../_components/sim-result";

const PCT_FMT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function parseNumber(raw: string): number {
  if (raw.trim() === "") return Number.NaN;
  return Number.parseFloat(raw.replace(",", "."));
}

export function RateConverterClient() {
  const inputId = useId();
  const [rate, setRate] = useState("");
  const [from, setFrom] = useState<RateInputPeriod>("monthly");

  const result = useMemo(
    () => InterestRateConverterService.convert({ ratePct: parseNumber(rate), from }),
    [rate, from],
  );

  const filled = rate.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          A taxa que você tem
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <WizardRadioCard
            title="Mensal"
            description="A taxa informada é ao mês."
            active={from === "monthly"}
            onSelect={() => setFrom("monthly")}
          />
          <WizardRadioCard
            title="Anual"
            description="A taxa informada é ao ano."
            active={from === "annual"}
            onSelect={() => setFrom("annual")}
          />
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
          >
            Taxa ({from === "monthly" ? "% ao mês" : "% ao ano"})
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0"
            className={wizardInputClass}
          />
        </div>
      </section>

      {filled && result.ok ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <ResultCard title="Ao mês" subtitle="Taxa mensal equivalente">
            <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
              {PCT_FMT.format(result.monthlyPct)}%
            </div>
          </ResultCard>
          <ResultCard title="Ao ano" subtitle="Taxa anual equivalente">
            <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
              {PCT_FMT.format(result.annualPct)}%
            </div>
          </ResultCard>
        </section>
      ) : filled ? (
        <p
          role="alert"
          className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          Taxa inválida. Não pode ser menor ou igual a -100%.
        </p>
      ) : null}
    </div>
  );
}
