"use client";

import { Gift } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { ThirteenthSalaryService } from "@/domain/services/thirteenth-salary.service";

import { MoneyInput } from "../../../_components/money-input";
import { BreakdownLine, ResultCard } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

interface FormValues {
  grossSalaryCents: bigint;
  monthsWorked: number;
  dependents: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ThirteenthClient({ prefill }: { prefill: { grossSalaryCents: string } }) {
  const form = useForm<FormValues>({
    defaultValues: {
      grossSalaryCents: BigInt(prefill.grossSalaryCents),
      monthsWorked: 12,
      dependents: 0,
    },
  });

  const salary = normalizeCents(useWatch({ control: form.control, name: "grossSalaryCents" }));
  const monthsWorked = useWatch({ control: form.control, name: "monthsWorked" }) ?? 12;
  const dependents = useWatch({ control: form.control, name: "dependents" }) ?? 0;

  const result = useMemo(
    () => ThirteenthSalaryService.compute({ grossSalaryCents: salary, monthsWorked, dependents }),
    [salary, monthsWorked, dependents],
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Seus dados
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="grossSalaryCents"
            label="Salário bruto"
            required
            helper="Puxado da sua renda; ajuste se precisar."
          />
          <SimSlider
            label="Meses trabalhados no ano"
            value={monthsWorked}
            min={1}
            max={12}
            step={1}
            displayValue={`${monthsWorked} ${monthsWorked === 1 ? "mês" : "meses"}`}
            onChange={(v) => form.setValue("monthsWorked", v)}
          />
          <SimSlider
            label="Dependentes"
            value={dependents}
            min={0}
            max={8}
            step={1}
            displayValue={`${dependents}`}
            onChange={(v) => form.setValue("dependents", v)}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] p-4 text-white shadow-[0_14px_32px_rgba(22,163,74,0.30)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
              13º líquido
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
              {brl(result.netCents)}
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              Total que você recebe nas duas parcelas.
            </p>
          </div>
          <Gift size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ResultCard title="1ª parcela" subtitle="Até 30/nov, sem descontos">
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            {brl(result.firstInstallmentCents)}
          </div>
        </ResultCard>
        <ResultCard title="2ª parcela" subtitle="Até 20/dez, já com descontos">
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            {brl(result.secondInstallmentCents)}
          </div>
        </ResultCard>
      </section>

      <section className="glass-light p-4">
        <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Descontos sobre o 13º
        </h3>
        <div className="flex flex-col">
          <BreakdownLine label="13º bruto" value={brl(result.gross13Cents)} />
          <BreakdownLine
            label="INSS (progressivo)"
            value={`- ${brl(result.inssCents)}`}
            tone="negative"
          />
          <BreakdownLine
            label={
              result.irrfBandPct > 0
                ? `Imposto de Renda (${result.irrfBandPct.toLocaleString("pt-BR")}%)`
                : "Imposto de Renda (isento)"
            }
            value={`- ${brl(result.irrfCents)}`}
            tone="negative"
          />
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-[color:var(--border-soft)] pt-2">
            <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
              Líquido
            </span>
            <span className="text-[0.9375rem] font-extrabold text-[color:var(--semantic-positive)]">
              {brl(result.netCents)}
            </span>
          </div>
        </div>
      </section>
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
