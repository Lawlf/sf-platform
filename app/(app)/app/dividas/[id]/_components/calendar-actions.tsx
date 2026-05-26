"use client";

import { CalendarPlus, Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { AlarmOffset } from "@/infrastructure/calendar/ics-builder";

const ALARM_OPTIONS: Array<{ value: AlarmOffset; label: string }> = [
  { value: "1d", label: "1 dia antes" },
  { value: "3d", label: "3 dias antes" },
  { value: "7d", label: "7 dias antes" },
  { value: "none", label: "Sem alarme" },
];

interface Props {
  debtId: string;
  googleCalendarUrl: string | null;
}

export function CalendarActions({ debtId, googleCalendarUrl }: Props) {
  const [alarm, setAlarm] = useState<AlarmOffset>("1d");
  const icsHref = `/app/dividas/${debtId}/calendario.ics?alarm=${alarm}`;

  return (
    <div className="flex flex-col gap-3">
      {googleCalendarUrl ? (
        <Button asChild variant="brand" className="w-full">
          <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
            <CalendarPlus size={16} strokeWidth={2} className="mr-2" aria-hidden />
            Adicionar ao Google Calendar
          </a>
        </Button>
      ) : null}

      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
        <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
          Usa outro calendário (Apple, Outlook...)? Baixe o arquivo e escolha onde importar.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.4px] text-[color:var(--text-muted)]">
            Lembrete
            <Select value={alarm} onValueChange={(v) => setAlarm(v as AlarmOffset)}>
              <SelectTrigger className="w-[140px]" aria-label="Lembrete">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALARM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button asChild size="sm" variant="outline">
            <a href={icsHref} download>
              <Download size={14} strokeWidth={2} className="mr-1.5" aria-hidden />
              Baixar .ics
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
