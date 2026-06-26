"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash } from "lucide-react";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";

import { queryKeys } from "../../../_lib/query-keys";
import { archiveDebtAction } from "../_actions/archive-debt.action";

interface Props {
  debtId: string;
  label?: string;
  recurring?: boolean;
  valueLabel?: string | undefined;
}

export function ArchiveDebtButton({ debtId, label, recurring = false, valueLabel }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const r = await archiveDebtAction({ debtId, reason: "paid_off" });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
      setOpen(false);
    });
  }

  const buttonLabel = recurring ? "Encerrei esse compromisso" : "Terminei de pagar";
  const dialogTitle = recurring ? "Encerrar esse compromisso?" : "Terminou de pagar essa dívida?";
  const named = label ? `"${label}"` : "isso";
  const dialogDescription = recurring
    ? `A gente para de contar ${named} no seu orçamento mensal, e ${
        valueLabel ? `o valor de ${valueLabel}` : "esse valor"
      } volta a ficar livre. Se voltar a pagar, é só reativar.`
    : `${
        label ? `Vamos marcar "${label}" como quitada` : "Vamos marcar como quitada"
      } e tirar da sua lista. Não registra valor nem comprovante; pra isso, use "Paguei a parcela". Se foi engano, dá pra reativar.`;
  const confirmLabel = recurring ? "Sim, encerrei" : "Sim, terminei";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)] sm:w-auto"
        >
          {recurring ? (
            <CircleSlash size={16} strokeWidth={2} className="mr-1.5" aria-hidden />
          ) : (
            <CheckCircle2 size={16} strokeWidth={2} className="mr-1.5" aria-hidden />
          )}
          {buttonLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Ainda não</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={onConfirm}
            className="relative"
          >
            <span className={pending ? "opacity-0" : "opacity-100"}>{confirmLabel}</span>
            {pending ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner size={16} />
              </span>
            ) : null}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
