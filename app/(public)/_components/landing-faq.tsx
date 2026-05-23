"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { faqItems as items } from "../_lib/faq-items";

import { RevealOnScroll } from "./reveal-on-scroll";

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <RevealOnScroll className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-[color:var(--text-secondary)]">
            Antes de decidir, o que a gente mais escuta:
          </p>
          <h2
            className="mt-3 text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
            style={{ letterSpacing: "-0.035em" }}
          >
            Perguntas reais. Respostas curtas.
          </h2>
        </div>

        <ul className="mt-10 divide-y divide-[color:var(--border-soft)] border-y border-[color:var(--border-soft)]">
          {items.map((item, idx) => {
            const isOpen = open === idx;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:bg-[color:var(--surface-3)]/40"
                >
                  <span
                    className="text-lg font-bold text-[color:var(--text-primary)] sm:text-xl"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {item.q}
                  </span>
                  <span
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
      </RevealOnScroll>
    </section>
  );
}
