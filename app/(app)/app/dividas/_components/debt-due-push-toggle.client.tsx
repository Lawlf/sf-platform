"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { DEBT_DUE_DAYS_BEFORE_DEFAULT } from "@/domain/entities/notification-preferences.entity";
import { cn } from "@/lib/utils";

import { updateDebtDueReminderAction } from "../_actions/update-debt-due-reminder.action";

function safeDays(value: number): number {
  return Number.isFinite(value) ? value : DEBT_DUE_DAYS_BEFORE_DEFAULT;
}

const DAYS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "No dia do vencimento" },
  { value: "1", label: "1 dia antes" },
  { value: "3", label: "3 dias antes" },
  { value: "7", label: "7 dias antes" },
];

function labelForDays(days: number): string {
  return DAYS_OPTIONS.find((o) => o.value === String(days))?.label ?? "3 dias antes";
}

interface Props {
  initialEnabled: boolean;
  initialDaysBefore: number;
  scopeNote?: string;
}

export function DebtDuePushToggle({ initialEnabled, initialDaysBefore, scopeNote }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [daysBefore, setDaysBefore] = useState(safeDays(initialDaysBefore));
  const [pending, startTransition] = useTransition();

  function persist(nextEnabled: boolean, nextDays: number, revert: () => void) {
    startTransition(async () => {
      const res = await updateDebtDueReminderAction({
        enabled: nextEnabled,
        daysBefore: safeDays(nextDays),
      });
      if (!res.ok) {
        revert();
        toast.error(res.message);
      }
    });
  }

  function toggle() {
    const prev = enabled;
    const next = !prev;
    setEnabled(next);
    persist(next, daysBefore, () => setEnabled(prev));
  }

  function changeDays(value: string) {
    const prev = daysBefore;
    const next = Number(value);
    setDaysBefore(next);
    persist(enabled, next, () => setDaysBefore(prev));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
          Me avisar antes do vencimento
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Me avisar antes do vencimento"
          onClick={toggle}
          disabled={pending}
          className={cn(
            "focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            enabled
              ? "bg-[color:var(--color-brand-500)]"
              : "bg-[color:var(--surface-3)] border border-[color:var(--border-strong)]",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform",
              enabled ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>

      {enabled ? (
        <div className="flex items-center justify-between gap-4 border-t border-[color:var(--border-soft)] pt-4">
          <label
            htmlFor="debt-due-when"
            className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]"
          >
            Quando avisar
          </label>
          <Select value={String(daysBefore)} onValueChange={changeDays} disabled={pending}>
            <SelectTrigger id="debt-due-when" className="w-[180px]" aria-label="Quando avisar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {enabled ? (
        <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-muted)]">
          Avisamos {labelForDays(daysBefore).toLowerCase()} de cada parcela.
          {scopeNote ? ` ${scopeNote}` : ""}
        </p>
      ) : null}
    </div>
  );
}
