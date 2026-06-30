"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { SavingsComparisonService } from "@/domain/services/savings-comparison.service";

import { WizardField } from "@/ui/wizard-field";
import { WizardMoneyField } from "../../dividas/nova/_components/wizard-money-field";
import { WizardRadioCard } from "../../dividas/nova/_components/wizard-radio-card";
import { WizardShell } from "../../dividas/nova/_components/wizard-shell";
import { findInstrument } from "../_lib/instruments";
import { optionsForHorizon, type ComparableProduct, type Horizon } from "../_lib/options";
import { earlyWithdrawalSeries, projectSeries } from "../_lib/projection";

import { OptionRow } from "./option-card";
import { OptionDetail } from "./option-detail";

type Step = "prazo" | "valor" | "resultado" | "detalhe" | "comofunciona";

const HORIZONS: { key: Horizon; label: string; ex: string }[] = [
  {
    key: "anytime",
    label: "A qualquer momento",
    ex: "É a reserva pra imprevisto, conserto, mês mais apertado.",
  },
  {
    key: "short",
    label: "Dentro de uns 2 anos",
    ex: "Tem um plano à vista: viagem, entrada de algo, troca de carro.",
  },
  {
    key: "long",
    label: "Daqui a mais de 2 anos",
    ex: "É dinheiro que pode ficar parado rendendo por um bom tempo.",
  },
];

const GROUP_TITLE: Record<Horizon, string> = {
  anytime: "Pra sacar a qualquer hora",
  short: "Pra usar dentro de 2 anos",
  long: "Pra deixar rendendo",
};

export function Decisor({
  initialAmountCents,
  cdiAnnualPct,
}: {
  initialAmountCents: string;
  cdiAnnualPct: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("prazo");
  const [horizon, setHorizon] = useState<Horizon | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const amountId = useId();

  const form = useForm<{ amountCents: bigint }>({
    defaultValues: {
      amountCents: (initialAmountCents ? BigInt(initialAmountCents) : 0n) as unknown as bigint,
    },
  });
  const amount = form.watch("amountCents");
  const amountBig = typeof amount === "bigint" ? amount : 0n;

  const comparison = useMemo(() => {
    if (horizon !== "anytime" || amountBig <= 0n) return null;
    return SavingsComparisonService.compare({
      amountCents: amountBig,
      months: 12,
      cdiAnnualPct,
      cdbPctCdi: 100,
    });
  }, [horizon, amountBig, cdiAnnualPct]);

  function finalFor(product: ComparableProduct | null): bigint | null {
    if (!comparison || !product) return null;
    return comparison[product].finalCents;
  }

  const ranked = useMemo(() => {
    if (!horizon) return [];
    const opts = optionsForHorizon(horizon);
    if (!comparison) return opts;
    return [...opts].sort((a, b) => {
      const fb = finalFor(b.comparable) ?? 0n;
      const fa = finalFor(a.comparable) ?? 0n;
      return fb > fa ? 1 : fb < fa ? -1 : 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, comparison]);

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  if (step === "prazo") {
    return (
      <WizardShell
        currentStep={1}
        totalSteps={3}
        title="Quando você pode precisar desse dinheiro?"
        description="Isso decide onde faz sentido guardar."
        onBack={() => router.push("/app" as Route)}
      >
        <div className="flex flex-col gap-2">
          {HORIZONS.map((h) => (
            <WizardRadioCard
              key={h.key}
              title={h.label}
              description={h.ex}
              active={horizon === h.key}
              onSelect={() => {
                setHorizon(h.key);
                setStep("valor");
              }}
            />
          ))}
        </div>
      </WizardShell>
    );
  }

  if (step === "valor") {
    return (
      <WizardShell
        currentStep={2}
        totalSteps={3}
        title="Quanto você quer guardar?"
        description="A gente já puxou sua reserva de hoje. Ajuste se quiser."
        onBack={() => setStep("prazo")}
        primary={{
          label: "Ver onde rende",
          onClick: () => setStep("resultado"),
          icon: arrowRight,
          disabled: amountBig <= 0n,
        }}
      >
        <WizardField label="Valor" htmlFor={amountId}>
          <WizardMoneyField
            control={form.control}
            name="amountCents"
            id={amountId}
            placeholder="R$ 0,00"
          />
        </WizardField>
      </WizardShell>
    );
  }

  const selected = horizon
    ? (optionsForHorizon(horizon).find((o) => o.key === selectedKey) ?? null)
    : null;
  if (step === "detalhe" && selected) {
    const projection =
      selected.comparable && amountBig > 0n
        ? projectSeries({ amountCents: amountBig, product: selected.comparable, cdiAnnualPct })
        : null;
    const earlyWithdrawal =
      selected.comparable && amountBig > 0n
        ? earlyWithdrawalSeries({
            amountCents: amountBig,
            product: selected.comparable,
            cdiAnnualPct,
          })
        : [];
    return (
      <WizardShell
        currentStep={3}
        totalSteps={3}
        title={selected.name}
        description="O que esperar e o que fazer com isso."
        onBack={() => setStep("resultado")}
      >
        <OptionDetail
          option={selected}
          amountCents={amountBig}
          cdiAnnualPct={cdiAnnualPct}
          projection={projection}
          earlyWithdrawal={earlyWithdrawal}
          onComoFunciona={() => setStep("comofunciona")}
        />
      </WizardShell>
    );
  }

  if (step === "comofunciona" && selected) {
    const instrument = findInstrument(selected.detailName);
    const fields = instrument
      ? [
          { label: "Pra que serve", value: instrument.goodFor },
          { label: "Quando dá pra sacar", value: instrument.liquidity },
          { label: "Risco", value: instrument.risk },
          { label: "Imposto", value: instrument.tax },
        ]
      : [];
    return (
      <WizardShell
        currentStep={3}
        totalSteps={3}
        title={`Como funciona ${selected.name}`}
        description={instrument?.whatIs ?? ""}
        onBack={() => setStep("detalhe")}
      >
        {instrument ? (
          <div className="flex flex-col divide-y divide-[color:var(--border-soft)]">
            {fields.map((f) => (
              <div key={f.label} className="py-3.5 first:pt-0">
                <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[color:var(--color-brand-800)]">
                  {f.label}
                </h3>
                <p className="mt-1.5 text-[0.875rem] leading-[1.5] text-[color:var(--text-secondary)]">
                  {f.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </WizardShell>
    );
  }

  return (
    <WizardShell
      currentStep={3}
      totalSteps={3}
      title={GROUP_TITLE[horizon ?? "anytime"]}
      description={
        comparison
          ? "Do que mais rende pro que menos, em 12 meses, já com o imposto."
          : "Opções que combinam com esse prazo. Toque pra ver os detalhes."
      }
      onBack={() => setStep("valor")}
    >
      <div className="flex flex-col gap-2">
        {ranked.map((opt) => (
          <OptionRow
            key={opt.key}
            option={opt}
            finalCents={finalFor(opt.comparable)}
            isBest={comparison != null && opt.comparable === comparison.best}
            onOpen={() => {
              setSelectedKey(opt.key);
              setStep("detalhe");
            }}
          />
        ))}
      </div>

      <Link
        href={"/app/simular/onde-rende-mais" as Route}
        className="focus-ring mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="text-[0.8125rem] font-medium text-[color:var(--text-primary)]">
          Onde rende mais? Faz a conta
        </span>
        <ArrowRight
          size={18}
          strokeWidth={2.25}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </Link>

      <p className="mt-3 text-[0.6875rem] leading-relaxed text-[color:var(--text-muted)]">
        Conteúdo educativo. A gente mostra as opções e as contas, não indica qual contratar.
      </p>
    </WizardShell>
  );
}
