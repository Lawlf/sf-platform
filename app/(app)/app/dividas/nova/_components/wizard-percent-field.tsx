"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import {
  type Control,
  Controller,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] pr-10 text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";

export interface WizardPercentFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  placeholder?: string;
  id?: string;
  step?: string;
  min?: number;
  max?: number;
}

interface InnerProps<TFieldValues extends FieldValues> {
  field: ControllerRenderProps<TFieldValues, Path<TFieldValues>>;
  placeholder?: string | undefined;
  id?: string | undefined;
  step?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
}

function PercentInputInner<TFieldValues extends FieldValues>(props: InnerProps<TFieldValues>) {
  const { field } = props;
  const numericValue =
    typeof field.value === "number" && Number.isFinite(field.value) ? (field.value as number) : 0;

  const [display, setDisplay] = useState<string>(numericValue === 0 ? "" : String(numericValue));

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplay(raw);
    if (raw === "") {
      field.onChange(0);
      return;
    }
    const normalized = raw.replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      field.onChange(parsed);
    }
  }

  function onFocus() {
    if (numericValue === 0) {
      setDisplay("");
    }
  }

  function onBlur() {
    setDisplay(numericValue === 0 ? "" : String(numericValue));
    field.onBlur();
  }

  return (
    <div className="relative">
      <input
        id={props.id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={props.placeholder ?? "0,00"}
        value={display}
        step={props.step}
        min={props.min}
        max={props.max}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={fieldClass}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.875rem] font-semibold text-[color:var(--text-muted)]"
      >
        %
      </span>
    </div>
  );
}

export function WizardPercentField<TFieldValues extends FieldValues>(
  props: WizardPercentFieldProps<TFieldValues>,
) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <PercentInputInner<TFieldValues>
          field={field}
          placeholder={props.placeholder}
          id={props.id}
          step={props.step}
          min={props.min}
          max={props.max}
        />
      )}
    />
  );
}
