"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import type { IncomeSourceBreakdown } from "@/domain/entities/income.entity";
import { HourlyRateService } from "@/domain/services/hourly-rate.service";

import { MoneyInput } from "../../../_components/money-input";
import { WizardRadioCard } from "@/ui/wizard-radio-card";
import { SimSlider } from "../../_components/sim-slider";

export interface WorkBreakdownValue {
  breakdown: IncomeSourceBreakdown;
  monthCents: bigint;
  hourlyCents: bigint | null;
}

interface LineValue {
  label?: string;
  count: number;
  valuePerShiftCents: bigint;
  hoursPerShift?: number;
}

interface FormValues {
  lines: LineValue[];
  hourlyCents: bigint;
  hoursPerWeek: number;
}

const DEFAULT_HOURS_PER_WEEK = 40;
const DEFAULT_HOURS_PER_SHIFT = 12;

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";

const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const linkButtonClass =
  "focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline";

function toFormDefaults(initial?: IncomeSourceBreakdown): {
  basis: "daily" | "hourly";
  values: FormValues;
  hasHours: boolean;
  hasExtraLines: boolean;
} {
  if (initial?.basis === "hourly") {
    return {
      basis: "hourly",
      hasHours: false,
      hasExtraLines: false,
      values: {
        lines: [{ count: 0, valuePerShiftCents: 0n }],
        hourlyCents: BigInt(initial.hourlyCents),
        hoursPerWeek: initial.hoursPerWeek,
      },
    };
  }
  if (initial?.basis === "daily") {
    const lines: LineValue[] = initial.lines.map((l) => ({
      ...(l.label ? { label: l.label } : {}),
      count: l.count,
      valuePerShiftCents: BigInt(l.valuePerShiftCents),
      ...(l.hoursPerShift != null ? { hoursPerShift: l.hoursPerShift } : {}),
    }));
    return {
      basis: "daily",
      hasHours: initial.lines.some((l) => l.hoursPerShift != null),
      hasExtraLines: lines.length > 1,
      values: { lines, hourlyCents: 0n, hoursPerWeek: DEFAULT_HOURS_PER_WEEK },
    };
  }
  return {
    basis: "daily",
    hasHours: false,
    hasExtraLines: false,
    values: {
      lines: [{ count: 0, valuePerShiftCents: 0n }],
      hourlyCents: 0n,
      hoursPerWeek: DEFAULT_HOURS_PER_WEEK,
    },
  };
}

export function WorkBreakdownFields({
  initial,
  onChange,
}: {
  initial?: IncomeSourceBreakdown;
  onChange: (value: WorkBreakdownValue) => void;
}) {
  const defaults = useMemo(() => toFormDefaults(initial), [initial]);
  const [basis, setBasis] = useState<"daily" | "hourly">(defaults.basis);
  const [showHours, setShowHours] = useState(defaults.hasHours);
  const [showExtraLines, setShowExtraLines] = useState(defaults.hasExtraLines);

  const form = useForm<FormValues>({ defaultValues: defaults.values });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const lines = useWatch({ control: form.control, name: "lines" });
  const hourlyCents = useWatch({ control: form.control, name: "hourlyCents" });
  const hoursPerWeek =
    useWatch({ control: form.control, name: "hoursPerWeek" }) ?? DEFAULT_HOURS_PER_WEEK;

  const breakdown = useMemo<IncomeSourceBreakdown>(() => {
    if (basis === "hourly") {
      return { basis: "hourly", hourlyCents: Number(hourlyCents ?? 0n), hoursPerWeek };
    }
    return {
      basis: "daily",
      lines: (lines ?? []).map((l) => ({
        ...(l.label ? { label: l.label } : {}),
        count: Number(l.count) || 0,
        valuePerShiftCents: Number(l.valuePerShiftCents ?? 0n),
        ...(showHours && l.hoursPerShift ? { hoursPerShift: Number(l.hoursPerShift) } : {}),
      })),
    };
  }, [basis, lines, hourlyCents, hoursPerWeek, showHours]);

  const serialized = JSON.stringify(breakdown);
  useEffect(() => {
    const projected = HourlyRateService.project(breakdown);
    onChange({ breakdown, monthCents: projected.monthCents, hourlyCents: projected.hourlyCents });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <WizardRadioCard
          active={basis === "daily"}
          onSelect={() => setBasis("daily")}
          title="Por diária"
          description="Plantão, turno, corrida, aula."
        />
        <WizardRadioCard
          active={basis === "hourly"}
          onSelect={() => setBasis("hourly")}
          title="Por hora"
          description="Você cobra por hora."
        />
      </div>

      {basis === "daily" ? (
        <div className="flex flex-col gap-4">
          <p className="text-[0.75rem] text-[color:var(--text-muted)]">
            Plantão, turno, corrida, aula: cada bloco que você cobra fechado.
          </p>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className={
                index === 0
                  ? "flex flex-col gap-3"
                  : "flex flex-col gap-3 rounded-xl border-[1.5px] border-[color:var(--border-soft)] p-3"
              }
            >
              {index > 0 ? (
                <div className="flex items-center justify-between">
                  <input
                    {...form.register(`lines.${index}.label` as const)}
                    placeholder="Ex: fim de semana, feriado"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remover tipo de diária"
                    className="focus-ring ml-2 shrink-0 rounded-lg p-2 text-[color:var(--text-muted)] hover:text-[color:var(--semantic-negative)]"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor={`count-${field.id}`}>
                    Quantas você faz no mês?
                  </label>
                  <input
                    id={`count-${field.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Ex: 8"
                    {...form.register(`lines.${index}.count` as const, { valueAsNumber: true })}
                    className={fieldClass}
                  />
                </div>
                <MoneyInput
                  control={form.control}
                  name={`lines.${index}.valuePerShiftCents` as const}
                  label="Quanto pagam cada uma?"
                />
              </div>

              {showHours ? (
                <div>
                  <label className={labelClass} htmlFor={`hours-${field.id}`}>
                    Quantas horas cada uma?
                  </label>
                  <input
                    id={`hours-${field.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={24}
                    {...form.register(`lines.${index}.hoursPerShift` as const, {
                      valueAsNumber: true,
                    })}
                    className={fieldClass}
                  />
                </div>
              ) : null}
            </div>
          ))}

          <div className="flex flex-col gap-2">
            {showExtraLines || fields.length > 1 ? (
              <button
                type="button"
                onClick={() => append({ count: 0, valuePerShiftCents: 0n })}
                className={linkButtonClass}
              >
                <Plus size={14} className="mr-1 inline" aria-hidden />
                Adicionar tipo de diária
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowExtraLines(true);
                  append({ count: 0, valuePerShiftCents: 0n });
                }}
                className={linkButtonClass}
              >
                <Plus size={14} className="mr-1 inline" aria-hidden />
                Adicionar tipo de diária (fim de semana, feriado)
              </button>
            )}

            {showHours ? null : (
              <button
                type="button"
                onClick={() => {
                  setShowHours(true);
                  form.setValue("lines.0.hoursPerShift", DEFAULT_HOURS_PER_SHIFT);
                }}
                className={linkButtonClass}
              >
                Mostrar quanto rende por hora
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="hourlyCents"
            label="Quanto vale sua hora?"
          />
          <SimSlider
            label="Horas por semana"
            value={hoursPerWeek}
            min={1}
            max={60}
            step={1}
            displayValue={`${hoursPerWeek}h`}
            onChange={(v) => form.setValue("hoursPerWeek", v)}
          />
        </div>
      )}
    </div>
  );
}

