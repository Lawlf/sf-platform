"use client";

import { useState } from "react";

import { MaskMoneyText } from "./money-visibility/mask-money-text.client";
import type { MoveCopy } from "./prescription-copy";

export function VerMais({ items, microEdu }: { items: MoveCopy[]; microEdu?: string }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0 && !microEdu) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[0.78125rem] font-semibold text-[color:var(--text-muted)] underline underline-offset-2 hover:text-[color:var(--text-secondary)]"
      >
        {open ? "Ver menos" : "Ver mais"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {microEdu ? (
            <p className="text-[0.78125rem] leading-[1.5] text-[color:var(--text-secondary)]">{microEdu}</p>
          ) : null}
          {items.length > 0 ? (
            <div className="border-t border-[color:var(--border-soft)] pt-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Depois dessa
              </p>
              <ul className="mt-2 space-y-3">
                {items.map((it, i) => (
                  <li key={i}>
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
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
