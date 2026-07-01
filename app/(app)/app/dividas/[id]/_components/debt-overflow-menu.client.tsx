"use client";

import { BellRing, CalendarPlus, ChevronLeft, ChevronRight, Pencil, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { SimpleTooltip } from "@/app/components/ui/tooltip";
import type { AlarmOffset } from "@/infrastructure/calendar/ics-builder";

import { DebtDuePushToggle } from "../../_components/debt-due-push-toggle.client";

import { DeleteDebtButton } from "./delete-debt-button";

const rowClass =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]";

const neutralButton =
  "focus-ring inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 text-sm font-medium text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] sm:w-auto";

const textLink =
  "focus-ring text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] underline-offset-2 hover:underline";

interface Props {
  debtId: string;
  debtLabel: string;
  hasCalendarSchedule: boolean;
  googleCalendarUrl: string | null;
  defaultAlarm: AlarmOffset;
  isPro: boolean;
  dueEnabled: boolean;
  dueDaysBefore: number;
}

type View = "menu" | "reminder";

export function DebtOverflowMenu({
  debtId,
  debtLabel,
  hasCalendarSchedule,
  googleCalendarUrl,
  defaultAlarm,
  isPro,
  dueEnabled,
  dueDaysBefore,
}: Props) {
  const [view, setView] = useState<View>("menu");
  const [showIcs, setShowIcs] = useState(false);
  const icsHref = `/app/dividas/${debtId}/calendario.ics?alarm=${defaultAlarm}`;

  return (
    <Sheet onOpenChange={(open) => !open && setView("menu")}>
      <SimpleTooltip label="Mais opções" side="bottom">
        <SheetTrigger
          className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]"
          aria-label="Mais opções"
        >
          <Settings size={20} strokeWidth={2} aria-hidden />
        </SheetTrigger>
      </SimpleTooltip>
      <SheetContent side="bottom" className="p-0">
        {view === "menu" ? (
          <>
            <SheetHeader className="p-4">
              <SheetTitle>Mais opções</SheetTitle>
            </SheetHeader>

            <div className="divide-y divide-[color:var(--border-soft)] border-t border-[color:var(--border-soft)]">
              {hasCalendarSchedule ? (
                <button type="button" onClick={() => setView("reminder")} className={rowClass}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
                    <BellRing size={18} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                      Lembrete de vencimento
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-[color:var(--text-secondary)]">
                      {dueEnabled ? "Ativado" : "Desligado"}
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    strokeWidth={2}
                    className="shrink-0 text-[color:var(--text-muted)]"
                    aria-hidden
                  />
                </button>
              ) : null}

              <Link href={`/app/dividas/${debtId}/editar` as Route} className={rowClass}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
                  <Pencil size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  Editar
                </span>
              </Link>

              <DeleteDebtButton debtId={debtId} label={debtLabel} trigger="row" />
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="flex-row items-center gap-2 space-y-0 border-b border-[color:var(--border-soft)] p-4">
              <button
                type="button"
                onClick={() => setView("menu")}
                aria-label="Voltar"
                className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]"
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden />
              </button>
              <SheetTitle>Lembrete de vencimento</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              {isPro ? (
                <DebtDuePushToggle
                  initialEnabled={dueEnabled}
                  initialDaysBefore={dueDaysBefore}
                  scopeNote="Vale pra todas as suas dívidas."
                />
              ) : null}

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
                <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
                  Quer que o app te avise sozinho, sem depender do calendário? Isso é do Pro.
                </p>
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
