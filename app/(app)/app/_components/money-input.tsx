"use client";

import { useId } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

export interface MoneyInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
  required?: boolean;
  helper?: string;
}

export function MoneyInput<TFieldValues extends FieldValues>(props: MoneyInputProps<TFieldValues>) {
  const inputId = useId();

  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor={inputId} className="font-medium">
            {props.label}
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            placeholder={props.placeholder ?? "R$ 0,00"}
            value={formatCentsForDisplay(field.value as bigint | null | undefined)}
            onChange={(e) => field.onChange(parseDisplayToCents(e.target.value))}
            onBlur={field.onBlur}
            aria-required={props.required}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
          />
          {props.helper ? <span className="text-xs opacity-70">{props.helper}</span> : null}
          {fieldState.error ? (
            <span role="alert" className="text-xs text-[color:var(--color-negative)]">
              {fieldState.error.message}
            </span>
          ) : null}
        </div>
      )}
    />
  );
}

function formatCentsForDisplay(cents: bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  return `${negative ? "-" : ""}${reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })}`;
}

function parseDisplayToCents(raw: string): bigint | null {
  if (raw.trim() === "") return null;
  // remove R$, spaces, dots (thousands), keep comma as decimal separator
  const digits = raw
    .replace(/[^\d,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = Number.parseFloat(digits);
  if (!Number.isFinite(num)) return null;
  return BigInt(Math.round(num * 100));
}
