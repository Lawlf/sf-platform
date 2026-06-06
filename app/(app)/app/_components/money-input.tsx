"use client";

import type { KeyboardEvent, ChangeEvent } from "react";
import { useId } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/app/components/ui/select";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";
import { formatCents } from "@/shared/format/money-format";

const MAX_CENTS = 999_999_999_99n;

const CURRENCY_NAME: Record<Currency, string> = {
  BRL: "Real",
  USD: "Dólar",
  EUR: "Euro",
  GBP: "Libra",
};

export interface MoneyInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  placeholder?: string;
  required?: boolean;
  helper?: string;
  currency?: Currency;
  onCurrencyChange?: (currency: Currency) => void;
}

export function MoneyInput<TFieldValues extends FieldValues>(props: MoneyInputProps<TFieldValues>) {
  const inputId = useId();
  const errorId = useId();
  const helperId = useId();
  const currency = props.currency ?? "BRL";
  const selectable = typeof props.onCurrencyChange === "function";
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field, fieldState }) => {
        const cents = toCents(field.value);
        const display = cents === 0n ? "" : formatCents(cents, currency);

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
            <div className="flex items-stretch overflow-hidden rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] transition-colors focus-within:border-[color:var(--color-brand-500)] focus-within:ring-2 focus-within:ring-[color:var(--color-brand-500)]/30">
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={props.placeholder ?? formatCents(0n, currency)}
                value={display}
                onKeyDown={handleKeyDown}
                onChange={handleChange}
                onBlur={field.onBlur}
                aria-required={props.required}
                aria-invalid={fieldState.error ? true : undefined}
                aria-describedby={
                  [fieldState.error ? errorId : null, props.helper ? helperId : null]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                className="w-full bg-transparent px-[14px] py-[12px] text-[0.9375rem] tabular-nums text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
              />
              {selectable ? (
                <>
                  <span aria-hidden className="my-[10px] w-px bg-[color:var(--border-soft)]" />
                  <Select
                    value={currency}
                    onValueChange={(v) => props.onCurrencyChange?.(v as Currency)}
                  >
                    <SelectTrigger
                      aria-label="Moeda"
                      className="h-auto gap-1.5 self-stretch rounded-none border-0 bg-transparent px-3.5 text-[0.8125rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)] ring-offset-0 transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)] focus-visible:bg-[color:var(--surface-2)] focus-visible:text-[color:var(--text-primary)] focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-[color:var(--surface-2)] data-[state=open]:text-[color:var(--text-primary)]"
                    >
                      {currency}
                    </SelectTrigger>
                    <SelectContent align="end" className="min-w-[10rem]">
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          <span className="flex items-baseline gap-2">
                            <span className="font-bold tracking-[0.5px]">{c}</span>
                            <span className="text-[0.75rem] text-[color:var(--text-muted)]">
                              {CURRENCY_NAME[c]}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}
            </div>
            {props.helper ? (
              <span id={helperId} className="text-[0.6875rem] text-[color:var(--text-muted)]">
                {props.helper}
              </span>
            ) : null}
            {fieldState.error ? (
              <span
                id={errorId}
                role="alert"
                className="text-[0.6875rem] text-[color:var(--semantic-negative)]"
              >
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
