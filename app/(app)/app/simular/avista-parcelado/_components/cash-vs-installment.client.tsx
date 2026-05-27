"use client";

import { Banknote, CreditCard, Scale } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CashVsInstallmentService } from "@/domain/services/cash-vs-installment.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard, ResultStat } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_DISCOUNT = 10;
const DEFAULT_INSTALLMENTS = 10;
const DEFAULT_RATE = 12;

interface FormValues {
  fullPriceCents: bigint;
  discountPct: number;
  installments: number;
  annualRatePct: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CashVsInstallmentClient() {
  const form = useForm<FormValues>({
    defaultValues: {
      fullPriceCents: 0n as unknown as bigint,
      discountPct: DEFAULT_DISCOUNT,
      installments: DEFAULT_INSTALLMENTS,
      annualRatePct: DEFAULT_RATE,
    },
  });

  const fullPrice = normalizeCents(useWatch({ control: form.control, name: "fullPriceCents" }));
  const discountPct = useWatch({ control: form.control, name: "discountPct" }) ?? DEFAULT_DISCOUNT;
  const installments = useWatch({ control: form.control, name: "installments" }) ?? DEFAULT_INSTALLMENTS;
  const annualRatePct = useWatch({ control: form.control, name: "annualRatePct" }) ?? DEFAULT_RATE;

  const result = useMemo(
    () =>
      CashVsInstallmentService.compute({
        fullPriceCents: fullPrice,
        discountPct,
        installments,
        annualRatePct,
      }),
    [fullPrice, discountPct, installments, annualRatePct],
  );

  const hasPrice = fullPrice > 0n;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          A compra
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="fullPriceCents"
            label="Preço cheio (parcelado)"
            required
            helper="O total se você parcelar sem juros."
          />
          <SimSlider
            label="Desconto à vista"
            value={discountPct}
            min={0}
            max={30}
            step={0.5}
            displayValue={`${discountPct}%`}
            onChange={(v) => form.setValue("discountPct", v)}
          />
          <SimSlider
            label="Número de parcelas"
            value={installments}
            min={2}
            max={24}
            step={1}
            displayValue={`${installments}x`}
            onChange={(v) => form.setValue("installments", v)}
          />
          <SimSlider
            label="Rendimento do seu dinheiro"
            value={annualRatePct}
            min={1}
            max={20}
            step={0.5}
            displayValue={`${annualRatePct}% ao ano`}
            onChange={(v) => form.setValue("annualRatePct", v)}
          />
        </div>
      </section>

      {hasPrice ? (
        <>
          <VerdictHero result={result} />
          <section className="grid gap-3 sm:grid-cols-2">
            <ResultCard title="À vista" subtitle="Com o desconto">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.cashPriceCents)}
              </div>
              <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">Você paga hoje.</p>
            </ResultCard>
            <ResultCard title="Parcelado" subtitle="Valor de hoje das parcelas">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.presentValueInstallmentCents)}
              </div>
              <ResultStat label="Cada parcela" value={`${installments}x ${brl(result.installmentValueCents)}`} />
            </ResultCard>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe o preço cheio para comparar à vista e parcelado.
          </p>
        </section>
      )}
    </div>
  );
}

function VerdictHero({ result }: { result: ReturnType<typeof CashVsInstallmentService.compute> }) {
  if (result.recommendation === "empate") {
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
              Empate
            </span>
            <div className="mt-1 text-[1.375rem] font-extrabold leading-tight text-[color:var(--text-primary)]">
              Tanto faz
            </div>
            <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
              O desconto à vista equivale ao ganho de parcelar e investir.
            </p>
          </div>
          <Scale size={32} strokeWidth={1.5} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
        </div>
      </section>
    );
  }

  const avista = result.recommendation === "avista";
  const gradient = avista
    ? "bg-[linear-gradient(135deg,#16a34a,#22c55e)] shadow-[0_14px_32px_rgba(22,163,74,0.30)]"
    : "bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] shadow-[0_14px_32px_rgba(239,122,26,0.30)]";
  const Icon = avista ? Banknote : CreditCard;

  return (
    <section className={`rounded-2xl p-4 text-white ${gradient}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
            Recomendado
          </span>
          <div className="mt-1 text-[1.625rem] font-extrabold leading-tight md:text-[1.875rem]">
            {avista ? "Pague à vista" : "Parcele sem juros"}
          </div>
          <p className="mt-2 text-[0.75rem] font-medium text-white/85">
            Em valor de hoje, você economiza <strong>{brl(result.advantageCents)}</strong>.
          </p>
        </div>
        <Icon size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
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
