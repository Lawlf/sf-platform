"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import type { AlarmOffset } from "@/infrastructure/calendar/ics-builder";

type AlarmChoice = AlarmOffset;

const ALARM_OPTIONS: Array<{ value: AlarmChoice; label: string }> = [
  { value: "1d", label: "1 dia antes" },
  { value: "3d", label: "3 dias antes" },
  { value: "7d", label: "7 dias antes" },
  { value: "none", label: "Sem alarme" },
];

interface Props {
  debtId: string;
  defaultAlarm?: AlarmChoice;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "brand" | "glass" | "ghost";
}

export function DownloadCalendarButton({
  debtId,
  defaultAlarm = "1d",
  size = "sm",
  variant = "outline",
}: Props) {
  const [alarm, setAlarm] = useState<AlarmChoice>(defaultAlarm);

  const href = `/app/dividas/${debtId}/calendario.ics?alarm=${alarm}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-[0.75rem] text-[color:var(--text-secondary)]">
        Lembrete
        <select
          value={alarm}
          onChange={(e) => setAlarm(e.target.value as AlarmChoice)}
          className="focus-ring h-9 rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-2 text-[0.8125rem] text-[color:var(--text-primary)]"
        >
          {ALARM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <Button asChild size={size} variant={variant}>
        <a href={href} download>
          <CalendarPlus size={14} strokeWidth={2} className="mr-1.5" aria-hidden />
          Baixar no calendário
        </a>
      </Button>
    </div>
  );
}
