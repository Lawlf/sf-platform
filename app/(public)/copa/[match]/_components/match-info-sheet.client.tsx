"use client";

import { HelpCircle } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

interface Props {
  stageLabel: string;
  kickoffLabel: string;
  venueName: string;
  venueCity: string;
}

export function MatchInfoSheet({ stageLabel, kickoffLabel, venueName, venueCity }: Props) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Detalhes do jogo"
        className="focus-ring inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] text-[color:var(--color-brand-800)] backdrop-blur-md transition-colors hover:bg-[color:var(--surface-1)]"
      >
        <HelpCircle size={16} strokeWidth={2.25} aria-hidden />
      </SheetTrigger>
      <SheetContent side="bottom" className="px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />
        <SheetHeader>
          <SheetTitle>Sobre o jogo</SheetTitle>
        </SheetHeader>
        <SheetDescription className="mt-3 text-[0.9375rem] leading-relaxed text-[color:var(--text-primary)]">
          {stageLabel} da Copa do Mundo 2026, {kickoffLabel}, no {venueName} ({venueCity}).
        </SheetDescription>
      </SheetContent>
    </Sheet>
  );
}
