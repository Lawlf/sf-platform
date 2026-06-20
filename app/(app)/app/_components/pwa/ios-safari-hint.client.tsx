"use client";

import { Compass, X } from "lucide-react";

interface Props {
  open: boolean;
  onDismiss: () => void;
}

export function IosSafariHint({ open, onDismiss }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4 shadow-[0_20px_50px_-20px_rgba(31,29,28,0.45)] backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:mx-0">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Compass size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
            Pra deixar na tela inicial
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            No iPhone, abre o Sabor no Safari. Só de lá dá pra adicionar o app à
            tela inicial.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar"
          className="focus-ring flex h-7 w-7 flex-none items-center justify-center rounded-full text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
