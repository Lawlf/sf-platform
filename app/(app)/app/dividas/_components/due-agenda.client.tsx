"use client";

import { CalendarClock, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/app/components/ui/sheet";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import type { UpcomingDuePayload } from "../_actions/upcoming-dues";
import { groupDuesByProximity } from "../_lib/due-buckets";

const AGENDA_HORIZON_DAYS = 30;

interface Props {
  dues: UpcomingDuePayload[];
  hasDueDatedDebt: boolean;
}

function whenLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `vence em ${daysUntil} dias`;
}

export function DueAgenda({ dues, hasDueDatedDebt }: Props) {
  if (!hasDueDatedDebt) return null;

  const buckets = groupDuesByProximity(dues);
  const firstDue = dues[0];
  const subtitle =
    dues.length === 0
      ? `Nada nos próximos ${AGENDA_HORIZON_DAYS} dias`
      : dues.length === 1 && firstDue
        ? `${firstDue.label} ${whenLabel(firstDue.daysUntil)}`
        : `${dues.length} nos próximos ${AGENDA_HORIZON_DAYS} dias`;

  return (
    <Sheet>
      <SheetTrigger className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
          <CalendarClock size={18} strokeWidth={2} aria-hidden />
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

        <div className="mt-4">
          {buckets.length === 0 ? (
            <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
              Nada vence nos próximos {AGENDA_HORIZON_DAYS} dias.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {buckets.map((bucket) => (
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
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
