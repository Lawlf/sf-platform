"use client";

import type { KeyboardEvent, ChangeEvent } from "react";
import { useId } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

const MAX_CENTS = 999_999_999_99n;

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
      render={({ field, fieldState }) => {
        const cents = toCents(field.value);
        const display = cents === 0n ? "" : formatCentsForDisplay(cents);

        function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
          if (e.metaKey || e.ctrlKey) return;
          if (e.key === "Backspace") {
            e.preventDefault();
            const next = cents / 10n;
            field.onChange(next);
            return;
          }
          if (e.key === "Delete") {
            e.preventDefault();
            field.onChange(0n);
            return;
          }
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const digit = BigInt(e.key);
            const next = cents * 10n + digit;
            if (next > MAX_CENTS) return;
            field.onChange(next);
            return;
          }
          if (
            ["Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
          ) {
            return;
          }
          e.preventDefault();
        }

        function handleChange(e: ChangeEvent<HTMLInputElement>) {
          const raw = e.target.value.replace(/[^\d]/g, "");
          if (raw === "") {
            field.onChange(0n);
            return;
          }
          const next = BigInt(raw);
          if (next > MAX_CENTS) return;
          field.onChange(next);
        }

        return (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={inputId}
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
            >
              {props.label}
            </label>
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={props.placeholder ?? "R$ 0,00"}
              value={display}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              onBlur={field.onBlur}
              aria-required={props.required}
              className="w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
            />
            {props.helper ? (
              <span className="text-[0.6875rem] text-[color:var(--text-muted)]">{props.helper}</span>
            ) : null}
            {fieldState.error ? (
              <span role="alert" className="text-[0.6875rem] text-[color:var(--semantic-negative)]">
                {fieldState.error.message}
              </span>
            ) : null}
          </div>
        );
      }}
    />
  );
}

function toCents(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.round(value));
  }
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function formatCentsForDisplay(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  return `${negative ? "-" : ""}${reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })}`;
}
