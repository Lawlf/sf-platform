"use client";

import { CalendarClock } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/app/components/ui/sheet";
import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { DueReminderConfig } from "./due-reminder-config.client";

interface Props {
  isPro: boolean;
  initialEnabled: boolean;
  initialDaysBefore: number;
}

export function DueAlertSettingsButton({ isPro, initialEnabled, initialDaysBefore }: Props) {
  return (
    <Sheet>
      <SimpleTooltip label="Avisos de vencimento" side="bottom">
        <SheetTrigger
          aria-label="Avisos de vencimento"
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-1)]"
        >
          <CalendarClock size={18} strokeWidth={2} aria-hidden />
        </SheetTrigger>
      </SimpleTooltip>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Avisos de vencimento</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <DueReminderConfig
            isPro={isPro}
            initialEnabled={initialEnabled}
            initialDaysBefore={initialDaysBefore}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
