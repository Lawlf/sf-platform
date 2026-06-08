"use client";

import { CalendarClock } from "lucide-react";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import type { UpcomingDuePayload } from "../_actions/upcoming-dues";

interface Props {
  dues: UpcomingDuePayload[];
}

function whenLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `vence em ${daysUntil} dias`;
}

export function DebtDueBanner({ dues }: Props) {
  if (dues.length === 0) return null;

  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--semantic-warning) 30%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--semantic-warning) 8%, transparent)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--semantic-warning) 16%, transparent)",
            color: "var(--semantic-warning)",
          }}
        >
          <CalendarClock size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            {dues.length === 1 ? "Vencimento próximo" : "Vencimentos próximos"}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {dues.map((due) => (
              <li
                key={due.debtId}
                className="flex items-baseline justify-between gap-3 text-[0.8125rem]"
              >
                <span className="min-w-0 truncate text-[color:var(--text-primary)]">
                  <span className="font-semibold">{due.label}</span>{" "}
                  <span className="text-[color:var(--text-secondary)]">{whenLabel(due.daysUntil)}</span>
                </span>
                {due.amountFormatted ? (
                  <span className="shrink-0 font-semibold text-[color:var(--text-primary)]">
                    <HideableValue>{due.amountFormatted}</HideableValue>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
