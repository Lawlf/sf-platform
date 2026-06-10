"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { StepUpGate } from "@/app/(app)/app/_components/step-up/step-up-gate.client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import { cancelSubscriptionAction } from "../_actions/cancel-subscription.action";

interface Props {
  accessUntilLabel: string;
  variant?: "primary" | "subtle" | "primary-sm";
}

export function CancelDialog({ accessUntilLabel, variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function doCancel() {
    const r = await cancelSubscriptionAction();
    if (r.ok && r.data.stepupRequired) {
      setStepUpOpen(true);
      return;
    }
    if (r.ok) {
      toast.success("Pro cancelado.", {
        description: `Você mantém acesso até ${accessUntilLabel}.`,
      });
      setOpen(false);
    } else {
      toast.error("Não rolou cancelar.", {
        description: r.message ?? "Tenta de novo em instantes.",
      });
    }
  }

  function handleConfirm() {
    startTransition(async () => {
      await doCancel();
    });
  }

  function handleStepUpConfirmed() {
    setStepUpOpen(false);
    startTransition(async () => {
      const r = await cancelSubscriptionAction();
      if (r.ok && !r.data.stepupRequired) {
        toast.success("Pro cancelado.", {
          description: `Você mantém acesso até ${accessUntilLabel}.`,
        });
        setOpen(false);
      } else {
        toast.error("Não rolou cancelar.", {
          description: r.ok
            ? "Confirme sua identidade para continuar."
            : r.message ?? "Tenta de novo em instantes.",
        });
      }
    });
  }

  return (
    <>
      {variant === "subtle" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6875rem] font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
        >
          <XCircle size={12} strokeWidth={2} aria-hidden />
          Cancelar plano
        </button>
      ) : variant === "primary-sm" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring inline-flex flex-shrink-0 items-center rounded-xl bg-red-600 px-3.5 py-2 text-[0.75rem] font-bold text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.6)] transition-[filter] hover:brightness-110"
        >
          Cancelar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-2.5 text-[0.8125rem] font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
        >
          <XCircle size={14} strokeWidth={2} aria-hidden />
          Cancelar
        </button>
      )}

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <SheetContent side="bottom" className="px-6 pb-8 pt-6">
          <div
            aria-hidden
            className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          />

          <SheetHeader className="items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertTriangle size={20} strokeWidth={2.2} aria-hidden />
            </span>
            <SheetTitle>Cancelar seu Pro?</SheetTitle>
            <SheetDescription>
              Nada cobrado a partir de agora. Você mantém todo o acesso Pro até{" "}
              <strong className="font-bold text-[color:var(--text-primary)]">
                {accessUntilLabel}
              </strong>
              . Depois disso, volta pro Free. Pode reativar a qualquer hora antes do fim
              do período.
            </SheetDescription>
          </SheetHeader>

          <ul className="mt-5 space-y-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-[0.8125rem] text-[color:var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--color-brand-500)]" />
              Seus dados ficam preservados.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--color-brand-500)]" />
              Nenhuma cobrança futura no cartão.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--color-brand-500)]" />
              Pode reativar em 1 clique enquanto o período pago durar.
            </li>
          </ul>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="focus-ring inline-flex items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-60"
            >
              Manter Pro
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              aria-busy={pending || undefined}
              className="focus-ring relative inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-[0.8125rem] font-bold text-white shadow-[0_10px_24px_-10px_rgba(220,38,38,0.6)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-80"
            >
              <span className={pending ? "opacity-0" : "opacity-100"}>
                Cancelar mesmo assim
              </span>
              {pending ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={16} />
                </span>
              ) : null}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <StepUpGate
        open={stepUpOpen}
        onOpenChange={setStepUpOpen}
        onConfirmed={handleStepUpConfirmed}
        title="Confirme para cancelar plano"
      />
    </>
  );
}
