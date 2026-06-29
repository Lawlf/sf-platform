"use client";

import { CalendarClock, Settings2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import type { UpcomingDuePayload } from "../_actions/upcoming-dues";
import { groupDuesByProximity } from "../_lib/due-buckets";

import { DueReminderConfig } from "./due-reminder-config.client";

const AGENDA_HORIZON_DAYS = 30;

interface Props {
  dues: UpcomingDuePayload[];
  hasDueDatedDebt: boolean;
  isPro: boolean;
  initialEnabled: boolean;
  initialDaysBefore: number;
}

function whenLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `vence em ${daysUntil} dias`;
}

export function DueAgenda({
  dues,
  hasDueDatedDebt,
  isPro,
  initialEnabled,
  initialDaysBefore,
}: Props) {
  if (!hasDueDatedDebt) return null;

  const buckets = groupDuesByProximity(dues);

  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--semantic-warning) 30%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--semantic-warning) 8%, transparent)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--semantic-warning) 16%, transparent)",
            color: "var(--semantic-warning)",
          }}
        >
          <CalendarClock size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
              Vencimentos próximos
            </p>
            <Sheet>
              <SheetTrigger
                aria-label="Avisos de vencimento"
                className="focus-ring -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
              >
                <Settings2 size={16} strokeWidth={1.9} aria-hidden />
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Avisos de vencimento</SheetTitle>
                  <SheetDescription>
                    A gente avisa quando uma parcela estiver perto de vencer. Você escolhe a
                    antecedência.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-5">
                  <DueReminderConfig
                    isPro={isPro}
                    initialEnabled={initialEnabled}
                    initialDaysBefore={initialDaysBefore}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {buckets.length === 0 ? (
            <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
              Nada vence nos próximos {AGENDA_HORIZON_DAYS} dias.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {buckets.map((bucket) => (
                <div key={bucket.key} className="flex flex-col gap-1.5">
                  <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
                    {bucket.label}
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {bucket.items.map((due) => (
                      <li
                        key={due.debtId}
                        className="flex items-baseline justify-between gap-3 text-[0.8125rem]"
                      >
                        <span className="min-w-0 truncate text-[color:var(--text-primary)]">
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
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
