"use client";

import { Paperclip } from "lucide-react";
import { useState } from "react";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";

import { PaymentDetailSheet, type PaymentRowData } from "./payment-detail-sheet.client";

export function PaymentsList({
  payments,
  isPro,
  collapsedByDefault,
}: {
  payments: PaymentRowData[];
  isPro: boolean;
  collapsedByDefault: boolean;
}) {
  const [open, setOpen] = useState(!collapsedByDefault);
  const [selected, setSelected] = useState<PaymentRowData | null>(null);

  if (payments.length === 0) return null;

  return (
    <div className="mt-3">
      {collapsedByDefault && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] underline underline-offset-2"
        >
          Ver {payments.length} {payments.length === 1 ? "pagamento" : "pagamentos"}
        </button>
      ) : (
        <ul className="flex flex-col">
          {payments.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className={`flex w-full items-center gap-3 py-3 text-left ${
                  i > 0 ? "border-t border-[color:var(--border-soft)]" : ""
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                    {p.dateLabel}
                  </span>
                  {p.isExtra ? (
                    <span className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                      pagamento extra
                    </span>
                  ) : null}
                </span>
                {p.hasNoteOrAttachment ? (
                  <Paperclip
                    size={14}
                    strokeWidth={2}
                    aria-label="Tem comprovante ou nota"
                    className="shrink-0 text-[color:var(--text-muted)]"
                  />
                ) : null}
                <span className="shrink-0 text-[0.9375rem] font-bold tabular-nums text-[color:var(--text-primary)]">
                  <HideableValue>{p.amountFormatted}</HideableValue>
                </span>
                <span aria-hidden className="shrink-0 text-[color:var(--text-muted)]">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <PaymentDetailSheet payment={selected} isPro={isPro} onClose={() => setSelected(null)} />
    </div>
  );
}
