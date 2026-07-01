"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useId, useState } from "react";

export interface FaqItem {
  q: string;
  a: string;
  cta?: { label: string; href: Route };
}

export function FaqAccordion({ items }: { items: ReadonlyArray<FaqItem> }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div
            key={item.q}
            className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : i)}
              className="focus-ring flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left text-[0.875rem] font-bold text-[color:var(--text-primary)]"
            >
              {item.q}
              <ChevronDown
                size={18}
                strokeWidth={2}
                aria-hidden
                className={`shrink-0 text-[color:var(--text-muted)] transition-transform duration-300 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              id={panelId}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4">
                  <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
                    {item.a}
                  </p>
                  {item.cta ? (
                    <Link
                      href={item.cta.href}
                      className="sf-lift focus-ring mt-3 inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-brand)] px-4 py-2 text-[0.8125rem] font-semibold text-white shadow-[var(--shadow-brand)]"
                    >
                      {item.cta.label}
                      <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
