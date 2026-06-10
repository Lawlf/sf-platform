"use client";

import type { ReactNode } from "react";

export interface WizardRadioCardProps {
  title: string;
  description: string;
  active: boolean;
  onSelect: () => void;
  icon?: ReactNode;
}

export function WizardRadioCard({ title, description, active, onSelect, icon }: WizardRadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`rounded-xl border-[1.5px] p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
        active
          ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/12"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)]"
      }`}
    >
      {icon ? (
        <span
          className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${
            active
              ? "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]"
              : "bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]"
          }`}
        >
          {icon}
        </span>
      ) : null}
      <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">{title}</div>
      <div className="mt-0.5 text-[0.625rem] text-[color:var(--text-primary)] opacity-65">
        {description}
      </div>
    </button>
  );
}
