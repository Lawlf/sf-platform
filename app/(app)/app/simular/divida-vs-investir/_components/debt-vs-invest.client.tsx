"use client";

import { PiggyBank, Scale, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { DebtVsInvestService } from "@/domain/services/debt-vs-invest.service";

import { MoneyInput } from "../../../_components/money-input";
import { WizardField } from "../../../dividas/nova/_components/wizard-field";
import { ResultCard, ResultStat, simSelectClass } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_INVEST_RATE = 10; // % a.a. líquido (CDI ~ pós-IR).
const DEFAULT_HORIZON = 24; // meses

interface DebtItem {
  id: string;
  label: string;
  balanceFormatted: string;
  annualRatePct: number;
}

interface FormValues {
  amountCents: bigint;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DebtVsInvestClient({ debts }: { debts: DebtItem[] }) {
  const form = useForm<FormValues>({ defaultValues: { amountCents: 0n as unknown as bigint } });
  const amountCents = normalizeCents(useWatch({ control: form.control, name: "amountCents" }));

  const [debtId, setDebtId] = useState<string>(debts[0]?.id ?? "");
  const [investRate, setInvestRate] = useState<number>(DEFAULT_INVEST_RATE);
  const [horizon, setHorizon] = useState<number>(DEFAULT_HORIZON);

  const selectedDebt = debts.find((d) => d.id === debtId) ?? debts[0];
  const debtRate = selectedDebt?.annualRatePct ?? 0;

  const result = useMemo(
    () =>
      DebtVsInvestService.simulate({
        amountCents,
        debtAnnualRatePct: debtRate,
        investAnnualRatePct: investRate,
        monthsHorizon: horizon,
      }),
    [amountCents, debtRate, investRate, horizon],
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Sua decisão
        </h2>
        <div className="flex flex-col gap-3">
          <WizardField
            label="Dívida em jogo"
            helper={`Juro desta dívida: ${debtRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% ao ano.`}
          >
            <Select value={debtId} onValueChange={setDebtId}>
              <SelectTrigger className={`${simSelectClass} h-auto w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {debts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label} - {d.balanceFormatted}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>

          <MoneyInput
            control={form.control}
            name="amountCents"
            label="Quantia disponível"
            required
            helper="O dinheiro que você tem pra decidir: abater a dívida ou investir."
          />

          <SimSlider
            label="Rendimento líquido do investimento"
            value={investRate}
            min={1}
            max={20}
            step={0.5}
            displayValue={`${investRate}% ao ano`}
            onChange={setInvestRate}
          />
          <SimSlider
            label="Horizonte de comparação"
            value={horizon}
            min={6}
            max={120}
            step={6}
            displayValue={`${horizon} meses`}
            onChange={setHorizon}
          />
        </div>
      </section>

      {amountCents <= 0n ? (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe a quantia disponível para comparar quitar e investir.
          </p>
        </section>
      ) : (
        <>
          <VerdictHero result={result} horizon={horizon} />

          <section className="grid gap-3 sm:grid-cols-2">
            <ResultCard title="Se quitar a dívida" subtitle="Juros que você evita">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.debtInterestSavedCents)}
              </div>
              <ResultStat label="Juro da dívida" value={`${debtRate.toFixed(1)}% a.a.`} />
            </ResultCard>
            <ResultCard title="Se investir" subtitle="Rendimento no período">
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.investEarnedCents)}
              </div>
              <ResultStat label="Rende" value={`${investRate.toFixed(1)}% a.a.`} />
            </ResultCard>
          </section>
        </>
      )}
    </div>
  );
}

function VerdictHero({
  result,
  horizon,
}: {
  result: ReturnType<typeof DebtVsInvestService.simulate>;
  horizon: number;
}) {
  if (result.recommendation === "empate") {
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
              Empate
            </span>
            <div className="mt-1 text-[1.375rem] font-extrabold leading-tight text-[color:var(--text-primary)]">
              Tanto faz pelo número
            </div>
            <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
              As taxas se equivalem. No empate, quitar dívida ganha pela segurança: retorno garantido
              e menos risco.
            </p>
          </div>
          <Scale size={32} strokeWidth={1.5} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
        </div>
      </section>
    );
  }

  const quitar = result.recommendation === "quitar";
  const gradient = quitar
    ? "bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] shadow-[0_14px_32px_rgba(239,122,26,0.30)]"
    : "bg-[linear-gradient(135deg,#16a34a,#22c55e)] shadow-[0_14px_32px_rgba(22,163,74,0.30)]";
  const Icon = quitar ? PiggyBank : TrendingUp;

  return (
    <section className={`rounded-2xl p-4 text-white ${gradient}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
            Recomendado
          </span>
          <div className="mt-1 text-[1.625rem] font-extrabold leading-tight md:text-[1.875rem]">
            {quitar ? "Quite a dívida" : "Invista a quantia"}
          </div>
          <p className="mt-2 text-[0.75rem] font-medium text-white/85">
            Você sai <strong>{brl(result.advantageCents)}</strong> na frente em {horizon} meses.
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
