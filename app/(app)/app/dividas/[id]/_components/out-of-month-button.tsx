"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CalendarOff } from "lucide-react";
import { useState, useTransition } from "react";

import {
  AlertDialog,
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

export function OutOfMonthButton({ debtId }: { debtId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const r = await archiveDebtAction({ debtId, reason: "written_off", note });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("written_off") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <CalendarOff size={16} strokeWidth={2} className="mr-1.5" aria-hidden />
          Tirar do meu mês
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tirar essa dívida do seu mês?</AlertDialogTitle>
          <AlertDialogDescription>
            Ela para de pesar no seu comprometido mensal. Continua no total que você deve, porque a
            dívida ainda existe.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="out-of-month-note"
            className="text-[0.75rem] font-semibold text-[color:var(--text-secondary)]"
          >
            Anotação (opcional)
          </label>
          <textarea
            id="out-of-month-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={pending}
            placeholder="Pra você lembrar. A gente não usa isso em nenhum cálculo."
            className="focus-ring resize-none rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]"
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
          <Button
            type="button"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={onConfirm}
            className="relative"
          >
            <span className={pending ? "opacity-0" : "opacity-100"}>Tirar do meu mês</span>
            {pending ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner size={16} />
              </span>
            ) : null}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
