"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Spinner } from "@/app/components/ui/spinner";

import { manageBillingAction } from "../_actions/manage-billing.action";

export function RetryPaymentButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      // On success the action redirects to the Stripe portal; only a failure
      // returns here.
      const r = await manageBillingAction();
      if (r && !r.ok) {
        toast.error("Não rolou abrir a cobrança.", {
          description: r.message ?? "Tenta de novo em instantes.",
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending || undefined}
      className="sf-lift focus-ring relative mt-3 inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-[0.75rem] font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-80"
    >
      <span className={pending ? "opacity-0" : "opacity-100"}>
        Atualizar cartão e tentar de novo
      </span>
      {pending ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner size={14} />
        </span>
      ) : null}
    </button>
  );
}
