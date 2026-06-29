"use client";

import type { ChangeEvent, KeyboardEvent } from "react";

import type { Currency } from "@/domain/value-objects/money.vo";
import { applyCentsKey, parseCentsFromString } from "@/shared/format/money-input";
import { formatCents } from "@/shared/format/money-format";

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
    const result = applyCentsKey(cents, e.key);
    if (result.kind === "ignore") return;
    e.preventDefault();
    if (result.kind === "commit") props.onChange(result.cents);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = parseCentsFromString(e.target.value);
    if (next !== null) props.onChange(next);
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
