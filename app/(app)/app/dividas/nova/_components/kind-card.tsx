"use client";

import { type ReactNode, useState } from "react";

export interface KindCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function KindCard({ icon, title, description, selected, onSelect }: KindCardProps) {
  const [pending, setPending] = useState(false);

  function handleClick() {
    if (pending) return;
    setPending(true);
    window.setTimeout(() => {
      onSelect();
    }, 240);
  }

  const filled = selected || pending;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={filled}
      disabled={pending}
      className={`flex w-full items-center gap-3 rounded-[14px] border-[1.5px] p-3 backdrop-blur-[16px] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
        filled
          ? "scale-[0.98] border-[color:var(--color-brand-500)] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_6px_20px_rgba(239,122,26,0.35)]"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)] active:scale-[0.99]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${
          filled
            ? "bg-white/25 text-white"
            : "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-800)]"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 text-left">
        <span
          className={`block text-[0.875rem] font-bold transition-colors duration-200 ${
            filled ? "text-white" : "text-[color:var(--text-primary)]"
          }`}
        >
          {title}
        </span>
        <span
          className={`mt-0.5 block text-[0.6875rem] leading-[1.3] transition-colors duration-200 ${
            filled ? "text-white/90" : "text-[color:var(--text-primary)] opacity-65"
          }`}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
