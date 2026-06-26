"use client";

import { CreditCard } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { RevolvingCreditSimulatorService } from "@/domain/services/revolving-credit-simulator.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";
import { buildGoalSeedQuery } from "../../_lib/goal-seed";

const DEFAULT_RATE_PCT = 15; // Estimativa de rotativo do mercado BR quando o cartão não tem taxa.

interface FormValues {
  statementCents: bigint;
}

interface PrefillProps {
  prefill: { statementCents: string; monthlyRatePct: number | null; debtId: string | null };
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

export function RotativoClient({ prefill }: PrefillProps) {
  const form = useForm<FormValues>({
    defaultValues: { statementCents: BigInt(prefill.statementCents) },
  });

  const statementCents = normalizeCents(useWatch({ control: form.control, name: "statementCents" }));
  const statementReais = Number(statementCents) / 100;

  const initialPaymentReais = Math.round((Number(BigInt(prefill.statementCents)) / 100) * 0.15);
  const [paymentReais, setPaymentReais] = useState(initialPaymentReais);
  const [ratePct, setRatePct] = useState(prefill.monthlyRatePct ?? DEFAULT_RATE_PCT);

  const sliderMax = Math.max(Math.round(statementReais), 10);
  const clampedPaymentReais = Math.min(Math.max(paymentReais, 0), sliderMax);
  const paymentCents = BigInt(Math.round(clampedPaymentReais * 100));
  const paymentPctOfStatement =
    statementReais > 0 ? Math.round((clampedPaymentReais / statementReais) * 100) : 0;

  const result = useMemo(
    () =>
      RevolvingCreditSimulatorService.simulate({
        statementCents,
        monthlyPaymentCents: paymentCents,
        monthlyRate: ratePct / 100,
      }),
    [statementCents, paymentCents, ratePct],
  );

  const hasStatement = statementCents > 0n;
  const rateIsEstimate = prefill.monthlyRatePct === null;
  const payoffMonths = result.payoffMonth ?? 0;
  const monthsLabel = payoffMonths === 1 ? "mês" : "meses";

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Sua fatura
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="statementCents"
            label="Valor da fatura"
            helper="O total que fechou no cartão esse mês."
          />
          <SimSlider
            label="Quanto você consegue pagar por mês"
            value={clampedPaymentReais}
            min={0}
            max={sliderMax}
            step={10}
            displayValue={`${clampedPaymentReais.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            })} · cerca de ${paymentPctOfStatement}% da fatura`}
            onChange={setPaymentReais}
          />
          <div>
            <SimSlider
              label="Juro do cartão por mês"
              value={ratePct}
              min={1}
              max={20}
              step={0.5}
              displayValue={`${ratePct}% ao mês`}
              onChange={setRatePct}
            />
            {rateIsEstimate ? (
              <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
                Estimativa de 15% ao mês, média do mercado. Se você souber o juro do seu cartão,
                ajuste no slider, a conta acerta sozinha.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setPaymentReais((p) => Math.min(p + 100, sliderMax))}
            className="self-start text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] underline-offset-2 hover:underline"
          >
            E se eu pagar R$ 100 a mais por mês?
          </button>
        </div>
      </section>

      {!hasStatement ? (
        <section className="glass-light p-4 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Digite o valor da fatura pra ver quanto o rotativo custa.
        </section>
      ) : (
        <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {result.paysOff ? (
                <>
                  <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
                    Juro que você paga a mais
                  </span>
                  <div className="mt-1 text-[1.625rem] font-extrabold leading-tight md:text-[1.875rem]">
                    {brl(result.totalInterestCents)}
                  </div>
                  <p className="mt-2 text-[0.75rem] font-medium text-white/85">
                    Em {payoffMonths} {monthsLabel}, no ritmo de {brl(paymentCents)} por mês.
                  </p>
                  <p className="text-[0.75rem] font-medium text-white/85">
                    A fatura de {brl(statementCents)} vira {brl(result.totalPaidCents)} no total.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
                    Atenção
                  </span>
                  <div className="mt-1 text-[1.375rem] font-extrabold leading-tight md:text-[1.5rem]">
                    Nesse ritmo, a fatura não diminui
                  </div>
                  <p className="mt-2 text-[0.75rem] font-medium text-white/85">
                    Pagando {brl(paymentCents)} por mês, o juro desse mês já é{" "}
                    {brl(result.firstMonthInterestCents)}. Quase tudo que você paga vira juro.
                  </p>
                  <p className="mt-1 text-[0.75rem] font-medium text-white/85">
                    Arraste pra cima pra achar o valor que começa a derrubar a fatura.
                  </p>
                </>
              )}
            </div>
            <CreditCard size={34} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
          </div>
        </section>
      )}

      {hasStatement && result.paysOff ? (
        <ResultCard title="Pagar tudo agora x rolar a fatura">
          <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Pagando a fatura inteira agora:{" "}
            <strong className="text-[color:var(--semantic-positive)]">R$ 0 de juro</strong>. Rolando
            no seu ritmo:{" "}
            <strong className="text-[color:var(--text-primary)]">
              {brl(result.totalInterestCents)}
            </strong>
            .
          </p>
        </ResultCard>
      ) : null}

      {prefill.debtId ? (
        <div className="flex flex-col gap-2">
          <Link
            href={
              `/app/metas/nova?${buildGoalSeedQuery({
                type: "debt_payoff",
                debtId: prefill.debtId,
                monthlyContributionCents: paymentCents.toString(),
              })}` as Route
            }
            className="inline-flex items-center justify-center rounded-xl bg-[color:var(--color-brand-500)] px-4 py-3 text-sm font-semibold text-white"
          >
            Criar meta de quitar esse cartão
          </Link>
          <Link
            href={`/app/dividas/${prefill.debtId}` as Route}
            className="inline-flex items-center justify-center rounded-xl border border-[color:var(--border-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)]"
          >
            Voltar pro cartão
          </Link>
        </div>
      ) : null}
    </div>
  );
}
