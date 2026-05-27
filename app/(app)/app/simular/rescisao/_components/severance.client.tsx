"use client";

import { FileText } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { SeveranceService } from "@/domain/services/severance.service";

import { MoneyInput } from "../../../_components/money-input";
import { BreakdownLine } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

interface FormValues {
  grossSalaryCents: bigint;
  completedYears: number;
  monthsThisYear: number;
  daysWorkedInMonth: number;
  fgtsBalanceCents: bigint;
  dependents: number;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SeveranceClient({ prefill }: { prefill: { grossSalaryCents: string } }) {
  const form = useForm<FormValues>({
    defaultValues: {
      grossSalaryCents: BigInt(prefill.grossSalaryCents),
      completedYears: 2,
      monthsThisYear: 6,
      daysWorkedInMonth: 15,
      fgtsBalanceCents: 0n as unknown as bigint,
      dependents: 0,
    },
  });

  const salary = normalizeCents(useWatch({ control: form.control, name: "grossSalaryCents" }));
  const completedYears = useWatch({ control: form.control, name: "completedYears" }) ?? 0;
  const monthsThisYear = useWatch({ control: form.control, name: "monthsThisYear" }) ?? 0;
  const daysWorkedInMonth = useWatch({ control: form.control, name: "daysWorkedInMonth" }) ?? 0;
  const fgts = normalizeCents(useWatch({ control: form.control, name: "fgtsBalanceCents" }));
  const dependents = useWatch({ control: form.control, name: "dependents" }) ?? 0;

  const result = useMemo(
    () =>
      SeveranceService.compute({
        grossSalaryCents: salary,
        completedYears,
        monthsThisYear,
        daysWorkedInMonth,
        fgtsBalanceCents: fgts,
        dependents,
      }),
    [salary, completedYears, monthsThisYear, daysWorkedInMonth, fgts, dependents],
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Sua situação
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
            label="Anos completos na empresa"
            value={completedYears}
            min={0}
            max={40}
            step={1}
            displayValue={`${completedYears} ${completedYears === 1 ? "ano" : "anos"}`}
            onChange={(v) => form.setValue("completedYears", v)}
          />
          <SimSlider
            label="Meses trabalhados neste ano"
            value={monthsThisYear}
            min={0}
            max={12}
            step={1}
            displayValue={`${monthsThisYear} ${monthsThisYear === 1 ? "mês" : "meses"}`}
            onChange={(v) => form.setValue("monthsThisYear", v)}
          />
          <SimSlider
            label="Dias trabalhados no mês da saída"
            value={daysWorkedInMonth}
            min={0}
            max={30}
            step={1}
            displayValue={`${daysWorkedInMonth} dias`}
            onChange={(v) => form.setValue("daysWorkedInMonth", v)}
          />
          <MoneyInput
            control={form.control}
            name="fgtsBalanceCents"
            label="Saldo de FGTS (opcional)"
            helper="Deixe vazio que a gente estima por 8% do salário x meses."
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
              Total a receber
            </span>
            <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
              {brl(result.totalWithFgtsCents)}
            </div>
            <p className="mt-2 text-[0.75rem] font-medium text-white/85">
              Verbas líquidas + multa 40% + saque do FGTS.
            </p>
          </div>
          <FileText size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
        </div>
      </section>

      <section className="glass-light p-4">
        <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Verbas rescisórias
        </h3>
        <div className="flex flex-col">
          <BreakdownLine label="Saldo de salário" value={brl(result.saldoSalarioCents)} />
          <BreakdownLine label="Aviso prévio indenizado" value={brl(result.avisoPrevioCents)} />
          <BreakdownLine label="13º proporcional" value={brl(result.decimoTerceiroCents)} />
          <BreakdownLine label="Férias proporcionais + 1/3" value={brl(result.feriasCents)} />
          <BreakdownLine label="INSS" value={`- ${brl(result.inssCents)}`} tone="negative" />
          <BreakdownLine
            label="Imposto de Renda"
            value={`- ${brl(result.irrfCents)}`}
            tone="negative"
          />
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-[color:var(--border-soft)] pt-2">
            <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
              Verbas líquidas
            </span>
            <span className="text-[0.875rem] font-extrabold text-[color:var(--text-primary)]">
              {brl(result.verbasLiquidasCents)}
            </span>
          </div>
        </div>
      </section>

      <section className="glass-light p-4">
        <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          FGTS
        </h3>
        <div className="flex flex-col">
          <BreakdownLine label="Saldo a sacar" value={brl(result.fgtsBalanceCents)} />
          <BreakdownLine
            label="Multa de 40%"
            value={`+ ${brl(result.fgtsFineCents)}`}
            tone="positive"
          />
        </div>
      </section>

      <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
        Estimativa para demissão sem justa causa. Aviso prévio e férias indenizadas são isentos de
        INSS e IR; o 13º é tributado em separado. Verbas vencidas e descontos específicos do contrato
        podem mudar o valor.
      </p>
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
