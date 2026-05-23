"use client";

import { useTransition } from "react";

import { Spinner } from "@/app/components/ui/spinner";

import { updatePaymentMethodAction } from "../_actions/update-payment-method.action";

export function UpdateCardButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => void (await updatePaymentMethodAction()))}
      disabled={pending}
      aria-busy={pending || undefined}
      className="focus-ring relative inline-flex items-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.75rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-70"
    >
      <span className={pending ? "opacity-0" : "opacity-100"}>Atualizar</span>
      {pending ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner size={14} />
        </span>
      ) : null}
    </button>
  );
}
