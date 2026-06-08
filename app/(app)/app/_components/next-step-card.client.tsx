"use client";

import { useState } from "react";

import { MaskMoneyText } from "./money-visibility/mask-money-text.client";
import type { MoveCopy, TimelineLine } from "./prescription-copy";

export function VerMais({
  items,
  microEdu,
  timeline,
}: {
  items: MoveCopy[];
  microEdu?: string;
  timeline?: TimelineLine[];
}) {
  const [open, setOpen] = useState(false);
  const hasTimeline = (timeline?.length ?? 0) > 0;
  if (items.length === 0 && !microEdu && !hasTimeline) return null;
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
          {hasTimeline ? (
            <div className="border-t border-[color:var(--border-soft)] pt-3">
              <p className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                Os próximos meses, no seu ritmo
              </p>
              <ol className="mt-2 space-y-2">
                {timeline!.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: line.strong ? "var(--color-brand-500)" : "var(--text-muted)" }}
                    />
                    <span
                      className={
                        line.strong
                          ? "text-[0.8125rem] font-semibold leading-[1.45] text-[color:var(--text-primary)]"
                          : "text-[0.8125rem] leading-[1.45] text-[color:var(--text-secondary)]"
                      }
                    >
                      {line.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : items.length > 0 ? (
            <div className="border-t border-[color:var(--border-soft)] pt-3">
              <p className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
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
