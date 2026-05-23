"use client";

import { useId } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

export interface RateInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  helper?: string;
  required?: boolean;
  step?: number;
}

export function RateInput<TFieldValues extends FieldValues>(props: RateInputProps<TFieldValues>) {
  const inputId = useId();
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]"
          >
            {props.label}
          </label>
          <div className="relative">
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              step={props.step ?? 0.01}
              value={
                field.value === null || field.value === undefined
                  ? ""
                  : String(field.value as number)
              }
              onChange={(e) =>
                field.onChange(e.target.value === "" ? null : Number(e.target.value))
              }
              onBlur={field.onBlur}
              className="w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 pr-10 text-base text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
              aria-required={props.required}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)]">
              %
            </span>
          </div>
          {props.helper ? (
            <span className="text-xs text-[color:var(--text-muted)]">{props.helper}</span>
          ) : null}
          {fieldState.error ? (
            <span role="alert" className="text-xs text-[color:var(--semantic-negative)]">
              {fieldState.error.message}
            </span>
          ) : null}
        </div>
      )}
    />
  );
}
