"use client";

import type { ChangeEvent, KeyboardEvent } from "react";

import type { Currency } from "@/domain/value-objects/money.vo";
import { formatCents } from "@/shared/format/money-format";

const MAX_CENTS = 999_999_999_99n;

export interface MoneyInputControlledProps {
  value: bigint;
  onChange: (cents: bigint) => void;
  currency?: Currency;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  onBlur?: () => void;
}

export function MoneyInputControlled(props: MoneyInputControlledProps) {
  const currency = props.currency ?? "BRL";
  const cents = props.value;
  const display = cents === 0n ? "" : formatCents(cents, currency);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.metaKey || e.ctrlKey) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      props.onChange(cents / 10n);
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      props.onChange(0n);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const next = cents * 10n + BigInt(e.key);
      if (next > MAX_CENTS) return;
      props.onChange(next);
      return;
    }
    if (["Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      return;
    }
    e.preventDefault();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    if (raw === "") {
      props.onChange(0n);
      return;
    }
    const next = BigInt(raw);
    if (next > MAX_CENTS) return;
    props.onChange(next);
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] transition-colors focus-within:border-[color:var(--color-brand-500)] focus-within:ring-2 focus-within:ring-[color:var(--color-brand-500)]/30">
      <input
        id={props.id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={props.placeholder ?? formatCents(0n, currency)}
        value={display}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onBlur={props.onBlur}
        aria-label={props.ariaLabel}
        aria-invalid={props.ariaInvalid ? true : undefined}
        aria-describedby={props.ariaDescribedBy}
        className="w-full bg-transparent px-[14px] py-[12px] text-[0.9375rem] tabular-nums text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
      />
    </div>
  );
}
