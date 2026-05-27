"use client";

import { Wallet } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CltNetSalaryService } from "@/domain/services/clt-net-salary.service";

import { MoneyInput } from "../../../_components/money-input";
import { BreakdownLine } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

interface FormValues {
  grossCents: bigint;
  dependents: number;
  otherDeductionsCents: bigint;
}

interface PrefillProps {
  prefill: { grossCents: string };
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CltSalaryClient({ prefill }: PrefillProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      grossCents: BigInt(prefill.grossCents),
      dependents: 0,
      otherDeductionsCents: 0n as unknown as bigint,
    },
  });

  const gross = normalizeCents(useWatch({ control: form.control, name: "grossCents" }));
  const dependents = useWatch({ control: form.control, name: "dependents" }) ?? 0;
  const other = normalizeCents(useWatch({ control: form.control, name: "otherDeductionsCents" }));

  const result = useMemo(
    () =>
      CltNetSalaryService.compute({
        grossCents: gross,
        dependents,
        otherDeductionsCents: other,
      }),
    [gross, dependents, other],
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Seu salário
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="grossCents"
            label="Salário bruto"
            required
            helper="O valor antes dos descontos. Puxado da sua renda; ajuste se precisar."
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
          <MoneyInput
            control={form.control}
            name="otherDeductionsCents"
            label="Outros descontos (opcional)"
            helper="Vale-transporte, plano de saúde, etc. Não mudam o imposto."
          />
        </div>
      </section>

      <section className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] p-4 text-white shadow-[0_14px_32px_rgba(22,163,74,0.30)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
              Salário líquido
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
              {brl(result.netCents)}
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              É o que de fato cai na sua conta todo mês.
            </p>
          </div>
          <Wallet size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
        </div>
      </section>

      <section className="glass-light p-4">
        <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          De onde saem os descontos
        </h3>
        <div className="flex flex-col">
          <BreakdownLine label="Salário bruto" value={brl(gross)} />
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
          {other > 0n ? (
            <BreakdownLine label="Outros descontos" value={`- ${brl(other)}`} tone="negative" />
          ) : null}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-[color:var(--border-soft)] pt-2">
            <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
              Líquido
            </span>
            <span className="text-[0.9375rem] font-extrabold text-[color:var(--semantic-positive)]">
              {brl(result.netCents)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
          Imposto calculado pelo {result.usedSimplifiedDeduction ? "desconto simplificado" : "modelo de deduções legais"}
          {result.usedSimplifiedDeduction ? "" : " (INSS + dependentes)"}, o que deixa você pagar menos. Base do IR:{" "}
          {brl(result.irrfBaseCents)}.
        </p>
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
