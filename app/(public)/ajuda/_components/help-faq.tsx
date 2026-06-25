"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import type { FaqItem } from "../../_lib/faq-items";

export function HelpFaq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="mt-8 divide-y divide-[color:var(--border-soft)] border-y border-[color:var(--border-soft)]">
      {items.map((item, idx) => {
        const isOpen = open === idx;
        return (
          <li key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : idx)}
              aria-expanded={isOpen}
              aria-controls={`help-faq-panel-${idx}`}
              id={`help-faq-trigger-${idx}`}
              className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:bg-[color:var(--surface-3)]/40"
            >
              <span
                className="text-lg font-bold text-[color:var(--text-primary)] sm:text-xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                {item.q}
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isOpen
                    ? "border-transparent bg-[color:var(--color-brand-500)] text-white"
                    : "border-[color:var(--border-strong)] text-[color:var(--text-primary)]",
                )}
              >
                {isOpen ? (
                  <Minus className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                )}
              </span>
            </button>
            <div
              id={`help-faq-panel-${idx}`}
              role="region"
              aria-labelledby={`help-faq-trigger-${idx}`}
              inert={!isOpen}
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
                isOpen ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0">
                <p className="max-w-2xl pr-12 text-[15.5px] leading-relaxed text-[color:var(--text-secondary)]">
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
