"use client";

import { ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";

export interface WizardRadioCardProps {
  title: string;
  description?: string | undefined;
  active: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  chevron?: boolean;
  variant?: "primary" | "subtle";
}

export function WizardRadioCard({
  title,
  description,
  active,
  onSelect,
  icon,
  chevron = false,
  variant = "subtle",
}: WizardRadioCardProps) {
  const [pending, setPending] = useState(false);

  if (variant === "primary") {
    const filled = active || pending;

    function handleClick() {
      if (pending) return;
      setPending(true);
      onSelect();
    }

    return (
      <button
        type="button"
        role="radio"
        onClick={handleClick}
        aria-checked={filled}
        disabled={pending}
        className={`flex w-full items-center gap-3 rounded-[14px] border-[1.5px] p-3 backdrop-blur-[16px] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
          filled
            ? "scale-[0.98] border-[color:var(--color-brand-500)] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_6px_20px_rgba(239,122,26,0.35)]"
            : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)] active:scale-[0.99]"
        }`}
      >
        {icon ? (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${
              filled
                ? "bg-white/25 text-white"
                : "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-800)]"
            }`}
          >
            {icon}
          </span>
        ) : null}
        <span className="flex-1 text-left">
          <span
            className={`block text-[0.875rem] font-bold transition-colors duration-200 ${
              filled ? "text-white" : "text-[color:var(--text-primary)]"
            }`}
          >
            {title}
          </span>
          {description ? (
            <span
              className={`mt-0.5 block text-[0.6875rem] leading-[1.3] transition-colors duration-200 ${
                filled ? "text-white/90" : "text-[color:var(--text-primary)] opacity-65"
              }`}
            >
              {description}
            </span>
          ) : null}
        </span>
        <ChevronRight
          size={18}
          strokeWidth={2}
          aria-hidden
          className={`shrink-0 transition-colors duration-200 ${
            filled ? "text-white/90" : "text-[color:var(--text-primary)] opacity-40"
          }`}
        />
      </button>
    );
  }

  if (chevron) {
    return (
      <button
        type="button"
        role="radio"
        onClick={onSelect}
        aria-checked={active}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
          active
            ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/12"
            : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)]"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                active
                  ? "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]"
                  : "bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]"
              }`}
            >
              {icon}
            </span>
          ) : null}
          <span className="min-w-0">
            <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {title}
            </span>
            <span className="mt-0.5 block text-[0.6875rem] leading-[1.3] text-[color:var(--text-primary)] opacity-65">
              {description}
            </span>
          </span>
        </span>
        <ChevronRight
          size={18}
          strokeWidth={2}
          aria-hidden
          className="shrink-0 text-[color:var(--text-primary)] opacity-40"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      role="radio"
      onClick={onSelect}
      aria-checked={active}
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
