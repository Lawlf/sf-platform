"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";

import { queryKeys } from "../../../_lib/query-keys";
import { acknowledgeDueAction } from "../_actions/acknowledge-due.action";

import { OutOfMonthButton } from "./out-of-month-button";

interface Props {
  debtId: string;
  dueDay: number;
  cycleIso: string;
}

export function OverdueBanner({ debtId, dueDay, cycleIso }: Props) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function onPaid() {
    setError(null);
    startTransition(async () => {
      const r = await acknowledgeDueAction({ debtId, cycleIso, response: "paid" });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
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
            Venceu dia {dueDay}. Quando resolver, é só dizer aqui.
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
            <OutOfMonthButton debtId={debtId} />
          </div>
        </div>
      </div>
    </section>
  );
}
