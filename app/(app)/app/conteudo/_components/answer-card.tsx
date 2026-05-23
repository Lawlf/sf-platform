"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface AnswerCardProps {
  num: string;
  title: string;
  description: string;
  onSelect?: () => void;
  disabled?: boolean;
  pending?: boolean;
}

export function AnswerCard({ num, title, description, onSelect, disabled, pending }: AnswerCardProps): ReactNode {
  return (
    <button
      type="button"
      onClick={() => !disabled && !pending && onSelect?.()}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className="group flex w-full items-start gap-3.5 rounded-[16px] border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-left backdrop-blur-[16px] transition-all duration-200 hover:-translate-y-px hover:border-[color:var(--color-brand-500)]/40 hover:bg-[color:var(--surface-2)] hover:shadow-[0_12px_28px_-10px_rgba(239,122,26,0.25)] disabled:cursor-not-allowed disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[color:var(--border-soft)] text-[11px] font-extrabold tabular-nums text-[color:var(--text-secondary)] transition-colors group-hover:border-[color:var(--color-brand-500)]/35 group-hover:text-[color:var(--color-brand-800)]">
        {num}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight tracking-[-0.01em] text-[color:var(--text-primary)]">
          {title}
        </span>
        <span className="mt-1.5 block text-[12.5px] leading-[1.5] text-[color:var(--text-secondary)]">
          {description}
        </span>
      </span>
      <span className="mt-1 shrink-0 text-[color:var(--text-muted)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[color:var(--color-brand-600)]">
        <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
      </span>
    </button>
  );
}
