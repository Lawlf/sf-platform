"use client";

import { useId, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { MarginMarkupService } from "@/domain/services/margin-markup.service";

import { MoneyInput } from "../../../_components/money-input";
import { wizardInputClass } from "../../../dividas/nova/_components/wizard-field";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";
import { ResultCard } from "../../_components/sim-result";

type Mode = "analisar" | "definir";
type Base = "margem" | "markup";

interface FormValues {
  costCents: bigint;
  priceCents: bigint;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function MarginMarkupClient() {
  const pctId = useId();
  const form = useForm<FormValues>({
    defaultValues: {
      costCents: 0n as unknown as bigint,
      priceCents: 0n as unknown as bigint,
    },
  });

  const cost = normalizeCents(useWatch({ control: form.control, name: "costCents" }));
  const price = normalizeCents(useWatch({ control: form.control, name: "priceCents" }));

  const [mode, setMode] = useState<Mode>("analisar");
  const [base, setBase] = useState<Base>("markup");
  const [target, setTarget] = useState("");

  const analyze = useMemo(
    () => MarginMarkupService.fromCostPrice({ costCents: cost, priceCents: price }),
    [cost, price],
  );

  const targetPct = target.trim() === "" ? Number.NaN : Number.parseFloat(target.replace(",", "."));
  const suggestedPrice = useMemo(() => {
    if (!Number.isFinite(targetPct)) return 0n;
    return base === "margem"
      ? MarginMarkupService.priceForMargin({ costCents: cost, marginPct: targetPct })
      : MarginMarkupService.priceForMarkup({ costCents: cost, markupPct: targetPct });
  }, [cost, base, targetPct]);

  const suggested = useMemo(
    () => MarginMarkupService.fromCostPrice({ costCents: cost, priceCents: suggestedPrice }),
    [cost, suggestedPrice],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <WizardRadioCard
          title="Analisar preço"
          description="Tenho custo e preço."
          active={mode === "analisar"}
          onSelect={() => setMode("analisar")}
        />
        <WizardRadioCard
          title="Definir preço"
          description="Quero uma margem/markup."
          active={mode === "definir"}
          onSelect={() => setMode("definir")}
        />
      </div>

      <section className="glass-light p-4">
        <div className="flex flex-col gap-3">
          <MoneyInput control={form.control} name="costCents" label="Custo do produto" required />

          {mode === "analisar" ? (
            <MoneyInput control={form.control} name="priceCents" label="Preço de venda" required />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <WizardRadioCard
                  title="Por margem"
                  description="% sobre o preço."
                  active={base === "margem"}
                  onSelect={() => setBase("margem")}
                />
                <WizardRadioCard
                  title="Por markup"
                  description="% sobre o custo."
                  active={base === "markup"}
                  onSelect={() => setBase("markup")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={pctId}
                  className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
                >
                  {base === "margem" ? "Margem desejada (%)" : "Markup desejado (%)"}
                </label>
                <input
                  id={pctId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="0"
                  className={wizardInputClass}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {mode === "analisar" ? (
        price > 0n ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2">
              <ResultCard title="Margem" subtitle="Sobre o preço (até 100%)">
                <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                  {pct(analyze.marginPct)}
                </div>
              </ResultCard>
              <ResultCard title="Markup" subtitle="Sobre o custo">
                <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--color-brand-800)]">
                  {pct(analyze.markupPct)}
                </div>
              </ResultCard>
            </section>
            <p className="glass-light p-4 text-[0.8125rem] text-[color:var(--text-secondary)]">
              {analyze.profitCents < 0n ? "Prejuízo por venda" : "Lucro por venda"}:{" "}
              <strong
                className={
                  analyze.profitCents < 0n
                    ? "text-[color:var(--semantic-negative)]"
                    : "text-[color:var(--semantic-positive)]"
                }
              >
                {brl(analyze.profitCents)}
              </strong>
              .
            </p>
          </>
        ) : (
          <Empty text="Informe custo e preço para ver margem e markup." />
        )
      ) : Number.isFinite(targetPct) && cost > 0n && suggestedPrice > 0n ? (
        <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
            Preço de venda sugerido
          </span>
          <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
            {brl(suggestedPrice)}
          </div>
          <p className="mt-2 text-[0.75rem] font-medium text-white/85">
            Dá margem de {pct(suggested.marginPct)} e markup de {pct(suggested.markupPct)}.
          </p>
        </section>
      ) : mode === "definir" && Number.isFinite(targetPct) && base === "margem" && targetPct >= 100 ? (
        <p
          role="alert"
          className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          Margem de 100% ou mais é impossível: ela é calculada sobre o preço. Talvez você queira
          markup.
        </p>
      ) : (
        <Empty text="Informe custo e a margem/markup desejado para ver o preço." />
      )}

      <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
        Margem = lucro ÷ preço (nunca passa de 100%). Markup = lucro ÷ custo (pode passar). Um markup
        de 150% é uma margem de 60%.
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
      <p className="text-[0.875rem] text-[color:var(--text-secondary)]">{text}</p>
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
