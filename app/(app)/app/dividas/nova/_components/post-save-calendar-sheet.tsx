"use client";

import { Calendar } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

import { DownloadCalendarButton } from "../../[id]/_components/download-calendar-button";

interface Props {
  open: boolean;
  debtId: string | null;
  onContinue: () => void;
}

export function PostSaveCalendarSheet({ open, debtId, onContinue }: Props) {
  function handleOpenChange(next: boolean) {
    if (!next) onContinue();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Calendar size={18} strokeWidth={2} className="text-[color:var(--color-brand-500)]" aria-hidden />
            <SheetTitle>Dívida criada</SheetTitle>
          </div>
          <SheetDescription>
            Quer adicionar as parcelas ao seu calendário? Você recebe lembrete antes de cada vencimento.
          </SheetDescription>
        </SheetHeader>

        {debtId ? (
          <div className="mt-5 flex flex-col gap-3">
            <DownloadCalendarButton debtId={debtId} defaultAlarm="1d" size="default" />
            <Button type="button" variant="ghost" size="sm" onClick={onContinue}>
              Pular por agora
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
