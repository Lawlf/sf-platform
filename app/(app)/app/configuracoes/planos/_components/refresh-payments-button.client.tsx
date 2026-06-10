"use client";

import { RotateCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Spinner } from "@/app/components/ui/spinner";

import { refreshPaymentsAction } from "../_actions/refresh-payments.action";

export function RefreshPaymentsButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const r = await refreshPaymentsAction();
      if (!r.ok) {
        toast.error("Não rolou atualizar.", {
          description: r.message ?? "Tenta de novo.",
        });
        return;
      }
      if (r.data.created > 0) {
        toast.success(
          r.data.created === 1
            ? "1 cobrança nova sincronizada."
            : `${r.data.created} cobranças sincronizadas.`,
        );
      } else {
        toast.info("Tudo em dia.", {
          description: "Nada novo por aqui.",
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
      className="focus-ring relative inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1.5 text-[0.6875rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span
        className={`inline-flex items-center gap-1.5 transition-opacity ${
          pending ? "opacity-0" : "opacity-100"
        }`}
      >
        <RotateCw size={12} strokeWidth={2.2} aria-hidden />
        Atualizar
      </span>
      {pending ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner size={12} />
        </span>
      ) : null}
    </button>
  );
}
