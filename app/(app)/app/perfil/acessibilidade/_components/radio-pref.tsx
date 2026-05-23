"use client";

import { useState, useTransition } from "react";

import { savePrefAction } from "../_actions/save-pref.action";

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  prefKey: string;
  /** Atributo no <html> aplicado ao vivo (ex.: data-density). */
  attr: string;
  options: RadioOption[];
  current: string;
}

export function RadioPref({ prefKey, attr, options, current }: Props) {
  const [selected, setSelected] = useState(current);
  const [, startTransition] = useTransition();

  function pick(value: string) {
    if (value === selected) return;
    document.documentElement.setAttribute(attr, value); // aplica na hora
    setSelected(value);
    startTransition(async () => {
      await savePrefAction(prefKey, value);
    });
  }

  return (
    <div role="radiogroup" className="flex flex-col">
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(opt.value)}
            className="focus-ring -mx-1 flex items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-[color:var(--surface-3)]"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                active
                  ? "border-[color:var(--color-brand-500)]"
                  : "border-[color:var(--border-strong)]"
              }`}
            >
              {active ? (
                <span className="h-2 w-2 rounded-full bg-[color:var(--color-brand-500)]" />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                {opt.label}
              </span>
              {opt.hint ? (
                <span className="block text-[0.75rem] text-[color:var(--text-secondary)]">
                  {opt.hint}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
