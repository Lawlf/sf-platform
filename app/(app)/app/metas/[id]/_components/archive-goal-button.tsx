"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Archive } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

import { archiveGoalAction } from "../../_actions/goal-actions";
import { invalidateGoalCaches } from "../../_lib/invalidate";

interface Props {
  goalId: string;
  label?: string;
}

export function ArchiveGoalButton({ goalId, label }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setPending(true);
    const result = await archiveGoalAction(goalId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    await invalidateGoalCaches(queryClient);
    router.push("/app/metas" as Route);
  }

  const aria = label ? `Arquivar ${label}` : "Arquivar meta";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={aria}
          className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
            <Archive size={18} strokeWidth={2} aria-hidden />
          </span>
          <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Arquivar
          </span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar meta?</AlertDialogTitle>
          <AlertDialogDescription>
            A meta será arquivada e deixará de aparecer na lista principal. Você pode reativá-la
            depois.
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
            className="relative bg-[color:var(--color-brand-500)] hover:brightness-110 focus-visible:ring-[color:var(--color-brand-500)]"
          >
            <span className={pending ? "opacity-0" : "opacity-100"}>Arquivar</span>
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
