"use client";

import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  EmergencyFundService,
  type EmergencyFundStatus,
} from "@/domain/services/emergency-fund.service";

import { MoneyInput } from "../../../_components/money-input";
import { ResultCard, ResultStat } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

const DEFAULT_TARGET_MONTHS = 6;

interface FormValues {
  monthlyCostCents: bigint;
  currentReserveCents: bigint;
  contributionCents: bigint;
  targetMonths: number;
}

interface PrefillProps {
  prefill: { monthlyCostCents: string; currentReserveCents: string; contributionCents: string };
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_META: Record<
  EmergencyFundStatus,
  { label: string; icon: typeof ShieldCheck; gradient: string; tone: "ok" | "warn" | "bad" }
> = {
  ok: {
    label: "Reserva completa",
    icon: ShieldCheck,
    tone: "ok",
    gradient: "bg-[linear-gradient(135deg,#16a34a,#22c55e)] shadow-[0_14px_32px_rgba(22,163,74,0.30)]",
  },
  parcial: {
    label: "Reserva parcial",
    icon: ShieldAlert,
    tone: "warn",
    gradient: "bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] shadow-[0_14px_32px_rgba(239,122,26,0.30)]",
  },
  zerada: {
    label: "Sem reserva",
    icon: ShieldX,
    tone: "bad",
    gradient: "bg-[linear-gradient(135deg,#dc2626,#ef4444)] shadow-[0_14px_32px_rgba(220,38,38,0.30)]",
  },
};

export function EmergencyFundClient({ prefill }: PrefillProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      monthlyCostCents: BigInt(prefill.monthlyCostCents),
      currentReserveCents: BigInt(prefill.currentReserveCents),
      contributionCents: BigInt(prefill.contributionCents),
      targetMonths: DEFAULT_TARGET_MONTHS,
    },
  });

  const monthlyCost = normalizeCents(useWatch({ control: form.control, name: "monthlyCostCents" }));
  const reserve = normalizeCents(useWatch({ control: form.control, name: "currentReserveCents" }));
  const contribution = normalizeCents(useWatch({ control: form.control, name: "contributionCents" }));
  const targetMonths = useWatch({ control: form.control, name: "targetMonths" }) ?? DEFAULT_TARGET_MONTHS;

  const result = useMemo(
    () =>
      EmergencyFundService.simulate({
        monthlyCostCents: monthlyCost,
        currentReserveCents: reserve,
        targetMonths,
        monthlyContributionCents: contribution,
      }),
    [monthlyCost, reserve, targetMonths, contribution],
  );

  const meta = STATUS_META[result.status];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Seus números
        </h2>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="monthlyCostCents"
            label="Custo fixo mensal"
            helper="Gastos essenciais que continuam mesmo sem renda. Pré-preenchido com suas parcelas."
          />
          <MoneyInput
            control={form.control}
            name="currentReserveCents"
            label="Reserva atual"
            helper="O que você tem guardado e líquido. Veio das suas reservas."
          />
          <MoneyInput
            control={form.control}
            name="contributionCents"
            label="Aporte mensal pra reserva"
            helper="Quanto você consegue guardar por mês."
          />
          <SimSlider
            label="Meta de cobertura"
            value={targetMonths}
            min={1}
            max={24}
            step={1}
            displayValue={`${targetMonths} ${targetMonths === 1 ? "mês" : "meses"}`}
            onChange={(v) => form.setValue("targetMonths", v)}
          />
        </div>
      </section>

      <section className={`rounded-2xl p-4 text-white ${meta.gradient}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
              {meta.label}
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-tight md:text-[1.875rem]">
              {result.monthsCovered.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
              {result.monthsCovered === 1 ? "mês" : "meses"} coberto{result.monthsCovered === 1 ? "" : "s"}
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              {result.status === "ok"
                ? "Você atingiu sua meta de reserva. Tranquilidade garantida."
                : `Faltam ${brl(result.gapCents)} para cobrir ${targetMonths} meses.`}
            </p>
          </div>
          <Icon size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ResultCard title="Reserva-alvo" subtitle={`${targetMonths} meses de custo fixo`}>
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            {brl(result.targetCents)}
          </div>
          <ResultStat label="Você já tem" value={brl(reserve)} />
        </ResultCard>
        <ResultCard title="Pra completar" subtitle="Com seu aporte mensal">
          <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            {result.monthsToComplete === null
              ? "—"
              : result.monthsToComplete === 0
                ? "Pronto!"
                : `${result.monthsToComplete} ${result.monthsToComplete === 1 ? "mês" : "meses"}`}
          </div>
          <ResultStat label="Falta guardar" value={brl(result.gapCents)} />
          {result.monthsToComplete === null ? (
            <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">
              Defina um aporte mensal para estimar o prazo.
            </p>
          ) : null}
        </ResultCard>
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
