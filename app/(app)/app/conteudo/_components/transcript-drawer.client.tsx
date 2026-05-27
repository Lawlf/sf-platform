"use client";

import { useEffect, useRef } from "react";

import type { FlatLine } from "../_lib/beats";

export interface TranscriptDrawerProps {
  lines: FlatLine[];
  lineIndex: number;
  open: boolean;
}

export function TranscriptDrawer({ lines, lineIndex, open }: TranscriptDrawerProps) {
  const activeRef = useRef<HTMLParagraphElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [lineIndex, open]);

  return (
    <div
      aria-hidden={!open}
      className={`bg-warm-gradient absolute inset-0 z-30 flex flex-col transition-transform duration-500 ease-out ${
        open ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="inline-flex items-center gap-1.5 px-6 pb-1 pt-3 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--brand-ink)]">
        <span
          className="block h-[1.5px] w-3.5 rounded-full"
          style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
        />
        Transcript
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-3 py-1">
          {lines.map((l, i) => {
            const active = i === lineIndex;
            const past = i < lineIndex;
            return (
              <p
                key={i}
                ref={active ? activeRef : null}
                className={`font-serif text-[1.1875rem] leading-[1.32] tracking-[-0.01em] transition-opacity duration-300 ${
                  active
                    ? "font-bold text-[color:var(--text-primary)] opacity-100"
                    : past
                      ? "text-[color:var(--text-muted)] opacity-30"
                      : "text-[color:var(--text-muted)] opacity-55"
                }`}
              >
                {l.firstOfBeat ? (
                  <span className="mb-1 block text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-[color:var(--brand-ink)] opacity-70">
                    {l.beatLabel}
                  </span>
                ) : null}
                {l.text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
