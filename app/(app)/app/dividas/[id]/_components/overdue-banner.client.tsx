"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";

import { queryKeys } from "../../../_lib/query-keys";
import { showSettleToast } from "../../_lib/settle-toast";
import { settleOverdueAction } from "../_actions/settle-overdue.action";

import { OutOfMonthButton } from "./out-of-month-button";

interface Props {
  debtId: string;
  dueDay: number;
  cycleIso: string;
  amountFormatted: string | null;
  canAdjust: boolean;
}

export function OverdueBanner({ debtId, dueDay, cycleIso, amountFormatted, canAdjust }: Props) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function onPaid() {
    setError(null);
    startTransition(async () => {
      const r = await settleOverdueAction({ debtId, cycleIso });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      showSettleToast(r.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
      setDismissed(true);
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[color:var(--text-muted)]">
          <CalendarClock size={22} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Venceu dia {dueDay}
            {amountFormatted ? (
              <>
                {" · "}
                <span className="font-semibold text-[color:var(--text-primary)]">
                  {amountFormatted}
                </span>
              </>
            ) : null}
            . Quando pagar, toque em Paguei que já abato esse valor.
          </p>
          {error ? (
            <p role="alert" className="mt-1 text-sm text-[color:var(--semantic-negative)]">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={onPaid}
              className="relative"
            >
              <span className={pending ? "opacity-0" : "opacity-100"}>Paguei</span>
              {pending ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={14} />
                </span>
              ) : null}
            </Button>
            <OutOfMonthButton debtId={debtId} compact />
          </div>
          {canAdjust ? (
            <Link
              href={`/app/dividas/${debtId}/pagar` as Route}
              className="focus-ring mt-2 inline-block text-[0.8125rem] font-semibold text-[color:var(--text-muted)] underline-offset-2 hover:underline"
            >
              Paguei outro valor ou com juros? Ajustar
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
