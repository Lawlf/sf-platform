"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";

const MAX_CENTS = 999_999_999_99n;

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";

export interface WizardMoneyFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  placeholder?: string;
  id?: string;
  ariaInvalid?: boolean;
}

function toCents(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function formatCentsBRL(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  return `${negative ? "-" : ""}${reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })}`;
}

export function WizardMoneyField<TFieldValues extends FieldValues>(
  props: WizardMoneyFieldProps<TFieldValues>,
) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const cents = toCents(field.value);
        const display = cents === 0n ? "" : formatCentsBRL(cents);

        function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
          if (e.metaKey || e.ctrlKey) return;
          if (e.key === "Backspace") {
            e.preventDefault();
            field.onChange(cents / 10n);
            return;
          }
          if (e.key === "Delete") {
            e.preventDefault();
            field.onChange(0n);
            return;
          }
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const next = cents * 10n + BigInt(e.key);
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

        function onChange(e: ChangeEvent<HTMLInputElement>) {
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
          <input
            id={props.id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={props.placeholder ?? "R$ 0,00"}
            value={display}
            onKeyDown={onKeyDown}
            onChange={onChange}
            onBlur={field.onBlur}
            aria-invalid={props.ariaInvalid}
            className={fieldClass}
          />
        );
      }}
    />
  );
}
