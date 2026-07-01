"use client";

import { CalendarCheck } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { ArchiveDebtButton } from "./archive-debt-button";
import { OutOfMonthButton } from "./out-of-month-button";

interface Props {
  debtId: string;
  debtLabel: string;
  isRecurring: boolean;
}

export function MonthDecisionsMenu({ debtId, debtLabel, isRecurring }: Props) {
  return (
    <Sheet>
      <SimpleTooltip label="Decisões do mês" side="bottom">
        <SheetTrigger
          className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]"
          aria-label="Decisões do mês"
        >
          <CalendarCheck size={20} strokeWidth={2} aria-hidden />
        </SheetTrigger>
      </SimpleTooltip>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Decisões do mês</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ArchiveDebtButton debtId={debtId} label={debtLabel} recurring={isRecurring} />
          {!isRecurring ? <OutOfMonthButton debtId={debtId} /> : null}
        </div>
        <p className="mt-3 text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
          {isRecurring
            ? "Encerrar para de contar no seu mês e libera esse valor. A dívida some da lista, mas dá pra reativar."
            : "Terminei de pagar fecha a conta. Pausar mantém ela na sua dívida total, só não conta no seu comprometido até você reativar."}
        </p>
      </SheetContent>
    </Sheet>
  );
}
