"use client";

import { BellRing, CalendarPlus, ChevronDown } from "lucide-react";
import { useState } from "react";

import type { AlarmOffset } from "@/infrastructure/calendar/ics-builder";
import { cn } from "@/lib/utils";

import { DebtDuePushToggle } from "../../_components/debt-due-push-toggle.client";

interface Props {
  debtId: string;
  googleCalendarUrl: string | null;
  defaultAlarm?: AlarmOffset;
  isPro: boolean;
  dueEnabled: boolean;
  dueDaysBefore: number;
}

const neutralButton =
  "focus-ring inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 text-sm font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] sm:w-auto";

const textLink =
  "focus-ring text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] underline-offset-2 hover:underline";

export function DueReminder({
  debtId,
  googleCalendarUrl,
  defaultAlarm = "1d",
  isPro,
  dueEnabled,
  dueDaysBefore,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showIcs, setShowIcs] = useState(false);
  const icsHref = `/app/dividas/${debtId}/calendario.ics?alarm=${defaultAlarm}`;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center gap-2 rounded-md text-left text-sm text-[color:var(--text-secondary)]"
      >
        <BellRing size={16} strokeWidth={2} className="shrink-0" aria-hidden />
        <span className="flex-1">Lembrete de vencimento</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          inert={!open}
          className={cn(
            "overflow-hidden transition-opacity duration-200 ease-out motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="mt-3 flex flex-col gap-4 border-t border-[color:var(--border-soft)] pt-4">
            {isPro ? (
              <DebtDuePushToggle
                initialEnabled={dueEnabled}
                initialDaysBefore={dueDaysBefore}
                scopeNote="Vale pra todas as suas dívidas."
              />
            ) : null}

            <div className="flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-4">
              {googleCalendarUrl ? (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={neutralButton}
                >
                  <CalendarPlus size={15} strokeWidth={2} aria-hidden />
                  Adicionar ao Google Agenda
                </a>
              ) : null}

              {showIcs ? (
                <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
                  Apple, Outlook e outros: baixe o arquivo e importe no seu calendário.{" "}
                  <a href={icsHref} download className={textLink}>
                    Baixar arquivo
                  </a>
                </p>
              ) : (
                <button type="button" onClick={() => setShowIcs(true)} className={textLink}>
                  Uso outro calendário
                </button>
              )}

              {!isPro ? (
                <p className="mt-1 text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
                  Quer que o app te avise sozinho, sem depender do calendário? Isso é do Pro.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
