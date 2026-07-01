"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
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
import { Spinner } from "@/app/components/ui/spinner";
import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { queryKeys } from "../../_lib/query-keys";
import { deleteIncomeAction } from "../_actions/delete-income.action";

interface DeleteIncomeButtonProps {
  incomeId: string;
  label?: string;
  trigger?: "icon" | "row";
}

export function DeleteIncomeButton({ incomeId, label, trigger = "icon" }: DeleteIncomeButtonProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const r = await deleteIncomeAction(incomeId);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.incomes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["planning", "projection"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      setOpen(false);
    });
  }

  const aria = label ? `Apagar ${label}` : "Apagar renda";
  const description = label
    ? `Essa ação remove a renda "${label}" do registro. Não tem volta.`
    : "Essa ação remove a renda do registro. Não tem volta.";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger === "row" ? (
          <button
            type="button"
            aria-label={aria}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--semantic-negative)]/12 text-[color:var(--semantic-negative)]">
              <Trash2 size={18} strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[0.875rem] font-semibold text-[color:var(--semantic-negative)]">
              Apagar renda
            </span>
          </button>
        ) : (
          <SimpleTooltip label="Apagar renda">
            <button
              type="button"
              aria-label={aria}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--semantic-negative)]/[0.12] hover:text-[color:var(--semantic-negative)]"
            >
              <Trash2 size={15} strokeWidth={2} aria-hidden />
            </button>
          </SimpleTooltip>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar essa renda?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
