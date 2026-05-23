"use client";

import { X } from "lucide-react";
import { useTransition } from "react";

import { dismissNextDueAction } from "./next-due-card.action";

export interface NextDueCardProps {
  debtId: string;
  daysLabel: string;
  title: string;
  amountFormatted: string;
  dueDateLabel: string;
  dueIso: string;
  onDismissed?: () => void;
}

export function NextDueCard({
  debtId,
  daysLabel,
  title,
  amountFormatted,
  dueDateLabel,
  dueIso,
  onDismissed,
}: NextDueCardProps) {
  const [pending, startTransition] = useTransition();
  function onDismiss() {
    startTransition(async () => {
      await dismissNextDueAction(debtId, dueIso);
      onDismissed?.();
    });
  }
  return (
    <section
      className="relative flex items-center gap-3 rounded-2xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 p-4 backdrop-blur-[16px] backdrop-saturate-[180%]"
      aria-label="Próximo vencimento"
    >
      <button
        type="button"
        onClick={onDismiss}
        disabled={pending}
        className="focus-ring absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--semantic-negative)]"
        aria-label="Esconder este aviso até o próximo ciclo"
      >
        <X size={12} strokeWidth={2.5} aria-hidden />
      </button>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--semantic-negative)] text-lg font-extrabold text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]">
        {daysLabel}
      </span>
      <div className="flex-1 pr-6">
        <div className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--semantic-negative)]">
          Próximo vencimento
        </div>
        <div className="mt-0.5 text-sm font-bold text-[color:var(--text-primary)]">{title}</div>
        <div className="text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]">
          {amountFormatted} em {dueDateLabel}
        </div>
      </div>
    </section>
  );
}
