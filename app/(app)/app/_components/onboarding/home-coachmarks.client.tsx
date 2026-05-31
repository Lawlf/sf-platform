"use client";

import { useCallback, useEffect, useState } from "react";

import { dismissHomeTourAction } from "../../_actions/onboarding";

import { COACHMARK_STEPS, clampIndex } from "./coachmark-steps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: number;
}

export function HomeCoachmarks({ active }: { active: boolean }) {
  const [open, setOpen] = useState(active);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);

  const step = COACHMARK_STEPS[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      setPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const newRect: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setRect(newRect);
    // Compute tooltip vertical position inside the effect so render never touches window.
    // Prefer placing below the spotlight; if there is no room, place above it so the
    // card never overlaps the highlighted element.
    const EST_TOOLTIP_H = 210;
    const spaceBelow = window.innerHeight - (r.top + r.height);
    const tooltipTop =
      spaceBelow >= EST_TOOLTIP_H + 24
        ? r.top + r.height + 16
        : Math.max(16, r.top - EST_TOOLTIP_H - 16);
    setPos({ top: tooltipTop });
  }, [step]);

  useEffect(() => {
    if (!open) return;
    // Bring the step's target into view before measuring. The smooth scroll fires
    // scroll events that re-run measure(), so the spotlight tracks to its final spot.
    const el = step ? document.querySelector(step.target) : null;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, step, measure]);

  function finish() {
    setOpen(false);
    void dismissHomeTourAction();
  }

  if (!open || !step) return null;

  const isLast = index === COACHMARK_STEPS.length - 1;
  const pad = 8;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Tour da tela inicial">
      {/* Spotlight: a hole over the target via a large box-shadow. If the target is
          not measurable, fall back to a plain dimming overlay. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl transition-all"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(15,12,10,0.66)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(15,12,10,0.66)]" />
      )}

      {/* Tooltip card. Positioned below the target when there is room, else near top.
          The `top` value comes from state (computed in measure()), never from window directly. */}
      <div
        className="absolute left-1/2 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-app)] p-4 text-[color:var(--text-primary)] shadow-2xl"
        style={{
          top: pos ? pos.top : 120,
        }}
      >
        <p className="text-sm font-semibold">{step.title}</p>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          >
            Pular
          </button>
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => clampIndex(i - 1))}
                className="rounded-lg px-3 py-1.5 text-sm"
              >
                Voltar
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setIndex((i) => clampIndex(i + 1)))}
              className="rounded-lg bg-[color:var(--color-brand-500)] px-3 py-1.5 text-sm font-semibold text-white"
            >
              {isLast ? "Entendi" : "Próximo"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[0.6875rem] text-[color:var(--text-muted)]">
          {index + 1} de {COACHMARK_STEPS.length}
        </p>
      </div>
    </div>
  );
}
