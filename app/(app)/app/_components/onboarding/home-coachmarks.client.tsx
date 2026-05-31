"use client";

import { useCallback, useEffect, useState } from "react";

import { dismissHomeTourAction } from "../../_actions/onboarding";

import { COACHMARK_STEPS, type CoachmarkStep } from "./coachmark-steps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: number;
}

// So' vale destacar um passo cujo alvo existe na tela E tem altura > 0. Cards que
// retornam null (ex: HomeGoalCard sem meta) deixam o wrapper com altura 0 -> o passo
// e' removido da sequencia (nao aparece nem conta no "X de N").
function visibleSteps(): CoachmarkStep[] {
  return COACHMARK_STEPS.filter((s) => {
    const el = document.querySelector(s.target);
    return !!el && el.getBoundingClientRect().height > 0;
  });
}

export function HomeCoachmarks({ active }: { active: boolean }) {
  const [open, setOpen] = useState(active);
  const [steps, setSteps] = useState<CoachmarkStep[]>([]);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);
  // Liga as transicoes de posicao so' DEPOIS da entrada, para o spotlight aparecer
  // com fade no lugar (nao deslizando do topo). Movimentos entre passos animam.
  const [entered, setEntered] = useState(false);

  const step = steps[index];

  function finish() {
    setOpen(false);
    void dismissHomeTourAction();
  }

  // Compute the visible steps once when the tour opens (after a frame so layout and
  // Suspense content have settled). If nothing is visible, end immediately.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const vs = visibleSteps();
      setSteps(vs);
      setIndex(0);
      setReady(true);
      if (vs.length === 0) {
        setOpen(false);
        void dismissHomeTourAction();
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open]);

  // Depois que os passos estao prontos e o primeiro paint aconteceu, liga as
  // transicoes de posicao (movimento entre passos). Antes disso fica desligado
  // para a entrada ser um fade no lugar, sem slide.
  useEffect(() => {
    if (!ready) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      setPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    // Compute tooltip vertical position inside the effect so render never touches window.
    // Prefer placing below the spotlight; if there is no room, place above it.
    const EST_TOOLTIP_H = 210;
    const spaceBelow = window.innerHeight - (r.top + r.height);
    const tooltipTop =
      spaceBelow >= EST_TOOLTIP_H + 24
        ? r.top + r.height + 16
        : Math.max(16, r.top - EST_TOOLTIP_H - 16);
    setPos({ top: tooltipTop });
  }, [step]);

  useEffect(() => {
    if (!open || !step) return;
    // Bring the step's target into view before measuring. The smooth scroll fires
    // scroll events that re-run measure(), so the spotlight tracks to its final spot.
    const el = document.querySelector(step.target);
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

  if (!open || !ready || !step) return null;

  const total = steps.length;
  const isLast = index === total - 1;
  const pad = 8;

  return (
    <div
      className="fixed inset-0 z-[100] animate-in fade-in duration-300"
      role="dialog"
      aria-label="Tour da tela inicial"
    >
      {/* Spotlight: a hole over the target via a large box-shadow. If the target is
          not measurable, fall back to a plain dimming overlay. */}
      {rect ? (
        <div
          className={`pointer-events-none absolute rounded-xl animate-in fade-in ${
            entered ? "transition-all duration-500 ease-out" : ""
          }`}
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

      {/* Tooltip card. Rendered only once its position is known, so it appears in
          place (fade + zoom, modal-style) instead of sliding in from the top. The
          transition-[top] then glides it between steps. */}
      {pos ? (
      <div
        className={`absolute left-1/2 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-app)] p-4 text-[color:var(--text-primary)] shadow-2xl animate-in fade-in zoom-in-95 ${
          entered ? "transition-[top] duration-500 ease-out" : ""
        }`}
        style={{
          top: pos.top,
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
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-lg px-3 py-1.5 text-sm"
              >
                Voltar
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setIndex((i) => Math.min(total - 1, i + 1)))}
              className="rounded-lg bg-[color:var(--color-brand-500)] px-3 py-1.5 text-sm font-semibold text-white"
            >
              {isLast ? "Entendi" : "Próximo"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[0.6875rem] text-[color:var(--text-muted)]">
          {index + 1} de {total}
        </p>
      </div>
      ) : null}
    </div>
  );
}
