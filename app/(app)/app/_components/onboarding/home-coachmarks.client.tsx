"use client";

import { useCallback, useEffect, useState } from "react";

import { dismissHomeTourAction } from "../../_actions/onboarding";

import { COACHMARK_STEPS, type CoachmarkStep, gateSteps } from "./coachmark-steps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: number;
}

const PAD = 8;
const EST_TOOLTIP_H = 210;

// Só vale destacar um passo cujo alvo existe na tela E tem altura > 0. Cards que
// retornam null (ex: HomeGoalCard sem meta) deixam o wrapper com altura 0 -> o passo
// é removido da sequência (não aparece nem conta no "X de N"). O gate por dado real
// (hasGoal) roda antes para não depender do timing do esqueleto do Suspense.
//
// A ordem dos cards na home é dinâmica (home-layout.ts varia por estado), então
// ordenamos pela posição REAL no DOM para o tour fluir topo->baixo em vez de seguir
// a ordem fixa da lista (que fazia o scroll pular pra frente e pra trás).
function visibleSteps(hasGoal: boolean): CoachmarkStep[] {
  return gateSteps(COACHMARK_STEPS, { hasGoal })
    .map((step) => ({ step, top: document.querySelector(step.target)?.getBoundingClientRect() }))
    .filter((s): s is { step: CoachmarkStep; top: DOMRect } => !!s.top && s.top.height > 0)
    .sort((a, b) => a.top.top - b.top.top)
    .map((s) => s.step);
}

export function HomeCoachmarks({ active, hasGoal }: { active: boolean; hasGoal: boolean }) {
  const [open, setOpen] = useState(active);
  const [steps, setSteps] = useState<CoachmarkStep[]>([]);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);
  // Transições de posição só DEPOIS da entrada: a entrada é um fade no lugar (sem
  // slide); entre passos o box plana até o componente.
  const [entered, setEntered] = useState(false);

  const step = steps[index];

  function finish() {
    setOpen(false);
    void dismissHomeTourAction();
  }

  // Posiciona spotlight + tooltip a partir de um retângulo (em coords de viewport).
  const place = useCallback((r: Rect) => {
    setRect(r);
    const spaceBelow = window.innerHeight - (r.top + r.height);
    const tooltipTop =
      spaceBelow >= EST_TOOLTIP_H + 24
        ? r.top + r.height + 16
        : Math.max(16, r.top - EST_TOOLTIP_H - 16);
    setPos({ top: tooltipTop });
  }, []);

  // Lê a posição real atual do alvo e posiciona (usado para a correção exata pós-scroll
  // e para acompanhar scroll manual).
  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      setPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    place({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step, place]);

  // Calcula os passos visíveis uma vez quando o tour abre (após um frame, pra layout
  // e conteúdo do Suspense assentarem). Se nada estiver visível, encerra na hora.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const vs = visibleSteps(hasGoal);
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
  }, [open, hasGoal]);

  // Liga as transições de posição após o primeiro paint (entrada = fade no lugar).
  useEffect(() => {
    if (!ready) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // Ao trocar de passo: posiciona o box direto na posição FINAL (onde o alvo fica
  // centralizado depois do scroll) e dispara o scroll suave. Os dois convergem, então
  // o box plana de uma vez até o destino em vez de perseguir cada frame do scroll
  // (que causava o "fica fora e se corrige"). Ao fim do scroll, uma medida exata
  // corrige eventuais limites de borda da página.
  useEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      setPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // Prevê a posição final REAL pós-scroll. scrollIntoView(center) tenta centralizar,
    // mas o scroll satura em [0, maxScroll]: no 1o passo (topo) e no último (fim) ele
    // não centraliza, então assumir o centro fazia o box nascer no meio e pular pro lugar.
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const desiredDelta = r.top + r.height / 2 - window.innerHeight / 2;
    const newScrollY = Math.min(Math.max(0, window.scrollY + desiredDelta), maxScroll);
    const predictedTop = r.top - (newScrollY - window.scrollY);
    place({ top: predictedTop, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    const settle = () => measure();
    window.addEventListener("scrollend", settle);
    const settleFallback = window.setTimeout(settle, 1000);

    // Só acompanha scroll/resize MANUAL depois que o scroll programático terminou,
    // para não reintroduzir o chase durante o glide.
    const onChange = () => measure();
    const attachId = window.setTimeout(() => {
      window.addEventListener("resize", onChange);
      window.addEventListener("scroll", onChange, true);
    }, 1000);

    return () => {
      window.removeEventListener("scrollend", settle);
      clearTimeout(settleFallback);
      clearTimeout(attachId);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, step, measure, place]);

  if (!open || !ready || !step) return null;

  const total = steps.length;
  const isLast = index === total - 1;

  return (
    <div
      className="fixed inset-0 z-[100] animate-in fade-in duration-300"
      role="dialog"
      aria-label="Tour da tela inicial"
    >
      {/* Spotlight: um buraco sobre o alvo via box-shadow gigante. Se o alvo não é
          mensurável, cai num overlay escurecido simples. */}
      {rect ? (
        <div
          className={`pointer-events-none absolute rounded-xl animate-in fade-in ${
            entered ? "transition-all duration-500 ease-out" : ""
          }`}
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15,12,10,0.66)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(15,12,10,0.66)]" />
      )}

      {/* Card do tooltip: renderizado só quando a posição é conhecida, pra aparecer
          no lugar (fade + zoom, estilo modal) em vez de deslizar do topo. */}
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
