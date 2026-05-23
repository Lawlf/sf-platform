"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export interface TimelineMonthCalendarProps {
  selectedIso: string | null;
  oldestUserDataIso: string | null;
  onSelect: (iso: string) => void;
}

function parseIsoYear(iso: string | null): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-\d{2}$/.exec(iso);
  return m && m[1] ? parseInt(m[1], 10) : null;
}

export function TimelineMonthCalendar({
  selectedIso,
  oldestUserDataIso,
  onSelect,
}: TimelineMonthCalendarProps) {
  const now = new Date();
  const initialYear = parseIsoYear(selectedIso) ?? now.getUTCFullYear();
  const [year, setYear] = useState<number>(initialYear);

  const minYear = parseIsoYear(oldestUserDataIso) ?? now.getUTCFullYear() - 5;
  const maxYear = now.getUTCFullYear();

  function hasData(monthIndex0: number): boolean {
    // monthIndex0 is 0-11; convert to 1-12 for compare
    const monthNum = monthIndex0 + 1;
    const targetIso = `${year}-${String(monthNum).padStart(2, "0")}`;
    if (!oldestUserDataIso) return false;
    const nowIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    return targetIso >= oldestUserDataIso && targetIso <= nowIso;
  }

  function buildIso(monthIndex0: number): string {
    return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span
          aria-label={`Ano ${year}`}
          className="text-[13px] font-bold text-[color:var(--text-primary)]"
        >
          {year}
        </span>
        <div className="flex gap-1.5">
          <SimpleTooltip label="Ano anterior">
            <button
              type="button"
              onClick={() => setYear((y) => Math.max(minYear, y - 1))}
              disabled={year <= minYear}
              aria-label="Ano anterior"
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} strokeWidth={2.25} aria-hidden />
            </button>
          </SimpleTooltip>
          <SimpleTooltip label="Próximo ano">
            <button
              type="button"
              onClick={() => setYear((y) => Math.min(maxYear, y + 1))}
              disabled={year >= maxYear}
              aria-label="Próximo ano"
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={14} strokeWidth={2.25} aria-hidden />
            </button>
          </SimpleTooltip>
        </div>
      </div>

      <div role="grid" className="grid grid-cols-4 gap-2">
        {MONTHS_PT.map((name, index) => {
          const iso = buildIso(index);
          const active = selectedIso === iso;
          const dataAvail = hasData(index);
          return (
            <button
              type="button"
              role="gridcell"
              key={name}
              onClick={() => onSelect(iso)}
              aria-label={`${name} ${year}${dataAvail ? " (com dados)" : ""}`}
              aria-selected={active}
              className={`focus-ring flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] font-bold transition-colors ${
                active
                  ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_4px_12px_rgba(239,122,26,0.3)]"
                  : "bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--color-brand-800)]"
              }`}
            >
              {name}
              {dataAvail ? (
                <span
                  aria-hidden
                  className={`h-1 w-1 rounded-full ${
                    active ? "bg-[color:var(--surface-1)]" : "bg-[color:var(--text-muted)]/40"
                  }`}
                />
              ) : (
                <span aria-hidden className="h-1 w-1 rounded-full bg-transparent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
