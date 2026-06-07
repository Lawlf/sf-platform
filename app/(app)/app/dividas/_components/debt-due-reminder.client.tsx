"use client";

import { BellRing, Crown, Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/lib/utils";

import { updateDebtDueReminderAction } from "../_actions/update-debt-due-reminder.action";

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
  isPro: boolean;
  initialEnabled: boolean;
  initialDaysBefore: number;
}

export function DebtDueReminderCard({ isPro, initialEnabled, initialDaysBefore }: Props) {
  const [enabled, setEnabled] = useState(isPro && initialEnabled);
  const [daysBefore, setDaysBefore] = useState(initialDaysBefore);
  const [pending, startTransition] = useTransition();

  function persist(nextEnabled: boolean, nextDays: number, revert: () => void) {
    startTransition(async () => {
      const res = await updateDebtDueReminderAction({
        enabled: nextEnabled,
        daysBefore: nextDays,
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
    <section className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <BellRing size={17} strokeWidth={1.9} aria-hidden />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
              Avisos de vencimento
            </h2>
            {!isPro ? (
              <Lock
                size={13}
                strokeWidth={2.25}
                className="text-[color:var(--text-muted)]"
                aria-hidden
              />
            ) : null}
          </div>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Receba um aviso quando uma parcela estiver perto de vencer. Você escolhe com quanta
            antecedência.
          </p>
        </div>
      </div>

      {isPro ? (
        <div className="mt-4 flex flex-col gap-4">
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
              Avisamos {labelForDays(daysBefore).toLowerCase()} de cada parcela. Para colocar um
              vencimento específico na sua agenda, abra a dívida e use &quot;adicionar ao
              calendário&quot;.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-[color:var(--surface-2)] p-3">
          <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Avisos de vencimento por push são um recurso Pro. No plano atual você ainda pode abrir
            cada dívida e adicionar o vencimento ao seu calendário.
          </p>
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring inline-flex w-fit items-center gap-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
          >
            Virar Pro
            <Crown size={13} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
