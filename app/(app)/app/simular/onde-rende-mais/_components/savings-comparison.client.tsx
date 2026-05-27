"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  SavingsComparisonService,
  type SavingsBest,
} from "@/domain/services/savings-comparison.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultStat } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_MONTHS = 12;
const DEFAULT_CDI = 10.5;
const DEFAULT_CDB_PCT = 100;

interface FormValues {
  amountCents: bigint;
  months: number;
  cdiAnnualPct: number;
  cdbPctCdi: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const LABELS: Record<SavingsBest, string> = {
  poupanca: "Poupança",
  cdb: "CDB",
  tesouro: "Tesouro Selic",
};

export function SavingsComparisonClient({ prefill }: { prefill: { amountCents: string } }) {
  const form = useForm<FormValues>({
    defaultValues: {
      amountCents: BigInt(prefill.amountCents),
      months: DEFAULT_MONTHS,
      cdiAnnualPct: DEFAULT_CDI,
      cdbPctCdi: DEFAULT_CDB_PCT,
    },
  });

  const amount = normalizeCents(useWatch({ control: form.control, name: "amountCents" }));
  const months = useWatch({ control: form.control, name: "months" }) ?? DEFAULT_MONTHS;
  const cdiAnnualPct = useWatch({ control: form.control, name: "cdiAnnualPct" }) ?? DEFAULT_CDI;
  const cdbPctCdi = useWatch({ control: form.control, name: "cdbPctCdi" }) ?? DEFAULT_CDB_PCT;

  const result = useMemo(
    () => SavingsComparisonService.compare({ amountCents: amount, months, cdiAnnualPct, cdbPctCdi }),
    [amount, months, cdiAnnualPct, cdbPctCdi],
  );

  const hasAmount = amount > 0n;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          A aplicação
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="amountCents"
            label="Valor aplicado"
            required
            helper="Quanto você vai investir. Puxado das suas reservas."
          />
          <SimSlider
            label="Prazo"
            value={months}
            min={1}
            max={60}
            step={1}
            displayValue={`${months} ${months === 1 ? "mês" : "meses"}`}
            onChange={(v) => form.setValue("months", v)}
          />
          <SimSlider
            label="CDI ao ano"
            value={cdiAnnualPct}
            min={5}
            max={20}
            step={0.25}
            displayValue={`${cdiAnnualPct}%`}
            onChange={(v) => form.setValue("cdiAnnualPct", v)}
          />
          <SimSlider
            label="Quanto o CDB rende do CDI"
            value={cdbPctCdi}
            min={70}
            max={130}
            step={1}
            displayValue={`${cdbPctCdi}% do CDI`}
            onChange={(v) => form.setValue("cdbPctCdi", v)}
          />
        </div>
      </section>

      {hasAmount ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <ProductCard
            label="Poupança"
            note="Isenta de IR"
            product={result.poupanca}
            best={result.best === "poupanca"}
            bestLabel={LABELS[result.best]}
          />
          <ProductCard
            label="CDB"
            note={`${cdbPctCdi}% do CDI`}
            product={result.cdb}
            best={result.best === "cdb"}
            bestLabel={LABELS[result.best]}
          />
          <ProductCard
            label="Tesouro Selic"
            note="~100% CDI + custódia"
            product={result.tesouro}
            best={result.best === "tesouro"}
            bestLabel={LABELS[result.best]}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe o valor para comparar onde rende mais.
          </p>
        </section>
      )}

      <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
        IR regressivo sobre o rendimento: 22,5% até 6 meses, caindo até 15% acima de 2 anos. A
        poupança é isenta. Valores de referência; o rendimento real varia por instituição.
      </p>
    </div>
  );
}

function ProductCard({
  label,
  note,
  product,
  best,
  bestLabel,
}: {
  label: string;
  note: string;
  product: { netYieldCents: bigint; taxCents: bigint; finalCents: bigint };
  best: boolean;
  bestLabel: string;
}) {
  return (
    <article
      className={`rounded-2xl border p-4 backdrop-blur-xl ${
        best
          ? "border-[color:var(--semantic-positive)]/40 bg-[color:var(--semantic-positive)]/[0.08]"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">{label}</h3>
        {best ? (
          <span className="rounded-full bg-[color:var(--semantic-positive)] px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-white">
            Rende mais
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[0.625rem] text-[color:var(--text-muted)]">{note}</p>
      <div
        className={`mt-3 text-[1.25rem] font-extrabold leading-none ${
          best ? "text-[color:var(--semantic-positive)]" : "text-[color:var(--text-primary)]"
        }`}
      >
        {brl(product.finalCents)}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <ResultStat label="Rendimento líquido" value={brl(product.netYieldCents)} />
        <ResultStat label="Imposto" value={brl(product.taxCents)} />
      </div>
      <span className="sr-only">{best ? `${bestLabel} rende mais.` : ""}</span>
    </article>
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
