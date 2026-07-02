"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { queryKeys } from "../../_lib/query-keys";
import { settleOverdueAction } from "../[id]/_actions/settle-overdue.action";
import type { OverduePayload } from "../_actions/overdue-list";
import type { UpcomingDuePayload } from "../_actions/upcoming-dues";
import { groupDuesByProximity } from "../_lib/due-buckets";
import { showSettleToast } from "../_lib/settle-toast";

const AGENDA_HORIZON_DAYS = 30;

interface Props {
  overdue: OverduePayload[];
  dues: UpcomingDuePayload[];
  hasDueDatedDebt: boolean;
}

function whenLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `vence em ${daysUntil} dias`;
}

export function DueAgenda({ overdue, dues, hasDueDatedDebt }: Props) {
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const visibleOverdue = overdue.filter((o) => !settled.has(o.debtId));
  const hasOverdue = visibleOverdue.length > 0;
  if (!hasDueDatedDebt && !hasOverdue) return null;

  function markSettled(debtId: string) {
    setSettled((prev) => new Set(prev).add(debtId));
  }

  const overdueIds = new Set(visibleOverdue.map((o) => o.debtId));
  const upcoming = dues.filter((d) => !overdueIds.has(d.debtId));
  const buckets = groupDuesByProximity(upcoming);

  const firstDue = upcoming[0];
  const subtitle = hasOverdue
    ? visibleOverdue.length === 1
      ? "1 conta vencida"
      : `${visibleOverdue.length} contas vencidas`
    : upcoming.length === 0
      ? `Nada nos próximos ${AGENDA_HORIZON_DAYS} dias`
      : upcoming.length === 1 && firstDue
        ? `${firstDue.label} ${whenLabel(firstDue.daysUntil)}`
        : `${upcoming.length} nos próximos ${AGENDA_HORIZON_DAYS} dias`;

  return (
    <Sheet>
      <SheetTrigger
        className="focus-ring flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
        style={
          hasOverdue
            ? {
                borderColor: "color-mix(in srgb, var(--semantic-negative) 30%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--semantic-negative) 8%, transparent)",
              }
            : {
                borderColor: "var(--border-soft)",
                backgroundColor: "var(--surface-1)",
              }
        }
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={
            hasOverdue
              ? {
                  backgroundColor: "color-mix(in srgb, var(--semantic-negative) 16%, transparent)",
                  color: "var(--semantic-negative)",
                }
              : { backgroundColor: "var(--surface-3)", color: "var(--text-secondary)" }
          }
        >
          {hasOverdue ? (
            <AlertCircle size={18} strokeWidth={1.75} aria-hidden />
          ) : (
            <CalendarClock size={18} strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Vencimentos próximos
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-[color:var(--text-secondary)]">
            {subtitle}
          </span>
        </span>
        <ChevronRight
          size={18}
          strokeWidth={2}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </SheetTrigger>

      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Vencimentos próximos</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          {hasOverdue ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--semantic-negative)]">
                Já pagou? Toque em Paguei que abato da dívida.
              </div>
              <ul className="flex flex-col gap-2">
                {visibleOverdue.map((item) => (
                  <OverdueRow
                    key={item.debtId}
                    item={item}
                    onSettled={() => markSettled(item.debtId)}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {buckets.length === 0 && !hasOverdue ? (
            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
              Nada vence nos próximos {AGENDA_HORIZON_DAYS} dias.
            </p>
          ) : (
            buckets.map((bucket) => (
              <div key={bucket.key} className="flex flex-col gap-1.5">
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
                  {bucket.label}
                </div>
                <ul className="flex flex-col">
                  {bucket.items.map((due) => (
                    <li key={due.debtId}>
                      <Link
                        href={`/app/dividas/${due.debtId}` as Route}
                        className="focus-ring -mx-1 flex items-center gap-2 rounded-lg px-1 py-1.5 text-[0.8125rem] transition-colors hover:bg-[color:var(--surface-2)]"
                      >
                        <span className="min-w-0 flex-1 truncate text-[color:var(--text-primary)]">
                          <span className="font-semibold">{due.label}</span>{" "}
                          <span className="text-[color:var(--text-secondary)]">
                            {whenLabel(due.daysUntil)}
                          </span>
                        </span>
                        {due.amountFormatted ? (
                          <span className="shrink-0 font-semibold text-[color:var(--text-primary)]">
                            <HideableValue>{due.amountFormatted}</HideableValue>
                          </span>
                        ) : null}
                        <ChevronRight
                          size={14}
                          strokeWidth={2}
                          className="shrink-0 text-[color:var(--text-muted)]"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OverdueRow({ item, onSettled }: { item: OverduePayload; onSettled: () => void }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPaid() {
    setError(null);
    startTransition(async () => {
      const r = await settleOverdueAction({ debtId: item.debtId, cycleIso: item.cycleIso });
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
      onSettled();
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1">
          <Link
            href={`/app/dividas/${item.debtId}` as Route}
            className="focus-ring truncate font-semibold text-[color:var(--text-primary)] hover:underline"
          >
            {item.label}
          </Link>{" "}
          <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">
            venceu dia {item.dueDay}
          </span>
        </span>
        {item.amountFormatted ? (
          <span className="shrink-0 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            <HideableValue>{item.amountFormatted}</HideableValue>
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
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
        {item.canAdjust ? (
          <Link
            href={`/app/dividas/${item.debtId}/pagar` as Route}
            className="focus-ring text-[0.8125rem] font-semibold text-[color:var(--text-muted)] underline-offset-2 hover:underline"
          >
            Ajustar
          </Link>
        ) : null}
      </div>
    </li>
  );
}
