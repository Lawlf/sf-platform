"use client";

import { useState } from "react";

import { MaskMoneyText } from "./money-visibility/mask-money-text.client";
import type { MoveCopy } from "./prescription-copy";

export function VerMais({ items }: { items: MoveCopy[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[0.78125rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2"
      >
        {open ? "Ver menos" : "Ver mais"}
      </button>
      {open && (
        <ul className="mt-3 space-y-3">
          {items.map((it, i) => (
            <li key={i} className="border-t border-[color:var(--border-soft)] pt-3">
              <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                <MaskMoneyText text={it.headline} />
              </p>
              <p className="mt-0.5 text-[0.78125rem] text-[color:var(--text-secondary)]">
                <MaskMoneyText text={it.impact} />
              </p>
              <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">{it.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
