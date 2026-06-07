"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
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
import { deleteDebtAction } from "../_actions/delete-debt.action";

interface DeleteDebtButtonProps {
  debtId: string;
  label?: string;
}

export function DeleteDebtButton({ debtId, label }: DeleteDebtButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const r = await deleteDebtAction(debtId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("written_off") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.netWorth }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assetsWithAllocations }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      setOpen(false);
      router.push("/app/dividas" as Route);
    });
  }

  const aria = label ? `Apagar ${label}` : "Apagar dívida";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={aria}
          className="w-full text-[color:var(--text-muted)] hover:bg-[color:var(--semantic-negative)]/[0.12] hover:text-[color:var(--semantic-negative)] sm:w-auto"
        >
          <Trash2 size={15} strokeWidth={2} className="mr-1.5" aria-hidden />
          Apagar dívida
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar essa dívida?</AlertDialogTitle>
          <AlertDialogDescription>
            {label
              ? `Vamos remover a dívida "${label}" e todos os pagamentos registrados nela.`
              : "Vamos remover a dívida e todos os pagamentos registrados nela."}{" "}
            Não tem volta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={onConfirm}
            className="relative"
          >
            <span className={pending ? "opacity-0" : "opacity-100"}>Sim, apagar</span>
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
