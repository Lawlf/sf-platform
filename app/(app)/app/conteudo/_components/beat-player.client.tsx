"use client";

import { Captions, ChevronLeft, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { recordModuleDoneAction } from "../_actions/complete-module.action";
import { flattenLines } from "../_lib/beats";
import { findModuleBeats } from "../_lib/module-registry";
import { useBeatSync } from "../_lib/use-beat-sync";
import { BeatStage } from "./beat-stage.client";
import { TranscriptDrawer } from "./transcript-drawer.client";

const BRAND_GRADIENT = "linear-gradient(135deg, #ef7a1a, #f28e25 60%, #f4a13a)";
const SCRUB_GRADIENT = "linear-gradient(90deg, #f28e25, #ef7a1a)";
const TICK = "linear-gradient(90deg, #f28e25, transparent)";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function BeatPlayer({
  trilhaSlug,
  num,
  audioSrc,
  prevNum,
  nextNum,
}: {
  trilhaSlug: string;
  num: number;
  audioSrc: string | null;
  prevNum: number | null;
  nextNum: number | null;
}) {
  const router = useRouter();
  // A página (Server Component) não pode serializar os componentes Visual dos beats,
  // então o player resolve os dados aqui no client a partir do registry.
  const moduleData = findModuleBeats(trilhaSlug, num);
  const beats = moduleData?.beats ?? [];
  const sync = useBeatSync(beats);
  const lines = flattenLines(beats);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ao terminar a narração: registra conclusão e auto-avança pro próximo módulo.
  const advancedRef = useRef(false);
  useEffect(() => {
    if (!sync.ended || advancedRef.current) return;
    advancedRef.current = true;
    const fd = new FormData();
    fd.set("moduleNum", String(num));
    void recordModuleDoneAction(fd);
    if (nextNum != null) {
      const t = setTimeout(() => router.push(`/app/conteudo/trilha/${nextNum}` as Route), 1200);
      return () => clearTimeout(t);
    }
  }, [sync.ended, nextNum, num, router]);

  // Trava o scroll da página atrás enquanto o player (overlay) está aberto.
  useEffect(() => {
    if (!moduleData) return;
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
    };
  }, [moduleData]);

  if (!moduleData) return null;

  const pct = sync.duration > 0 ? (sync.currentTime / sync.duration) * 100 : 0;
  const canSeek = sync.duration > 0 && !sync.failed && !!audioSrc;
  const beatLabel = beats[sync.beatIndex]?.label ?? "";
  const audioOff = sync.failed || !audioSrc;

  function seekFromBar(e: React.MouseEvent<HTMLDivElement>) {
    if (!canSeek) return;
    const r = e.currentTarget.getBoundingClientRect();
    sync.seek((e.clientX - r.left) / r.width);
  }

  // Portal pro body: escapa ancestrais com transform (a animação da trilha) e cobre
  // a viewport inteira, inclusive a header do app. Espaço fechado, sem scroll de página.
  const overlay = (
    <div className="bg-warm-gradient fixed inset-0 z-[100] flex flex-col overflow-hidden">
      <div className="bg-blob-top-right" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="relative flex h-[72px] shrink-0 items-center justify-center border-b border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 backdrop-blur-xl">
          <Link
            href={"/app/conteudo/trilha" as Route}
            aria-label="Voltar para a trilha"
            className="focus-ring absolute left-3 flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]"
          >
            <ChevronLeft size={18} aria-hidden />
            Trilha
          </Link>
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
            Capítulo {String(num).padStart(2, "0")}
          </span>
        </div>

        {/* área do visual; a drawer de transcript cobre só ela */}
        <div className="relative flex-1 overflow-hidden">
          <BeatStage beats={beats} beatIndex={sync.beatIndex} />
          <TranscriptDrawer lines={lines} lineIndex={sync.lineIndex} open={transcriptOpen} />
        </div>

        {/* player fixo embaixo (sempre visível, mesmo com transcript aberto) */}
        <div className="flex flex-col gap-4 px-6 pb-9 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--brand-ink)]">
                <span className="block h-[1.5px] w-3.5 rounded-full" style={{ background: TICK }} />
                <span className="truncate">{beatLabel}</span>
              </div>
              <div className="truncate font-serif text-[1.1875rem] font-bold leading-[1.15] tracking-[-0.02em] text-[color:var(--text-primary)]">
                {moduleData.title}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTranscriptOpen((v) => !v)}
              aria-label="Transcript"
              aria-pressed={transcriptOpen}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors ${
                transcriptOpen
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.12] text-[color:var(--brand-ink)]"
                  : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)]"
              }`}
            >
              <Captions size={17} aria-hidden />
            </button>
          </div>

          <div>
            <div
              role="slider"
              aria-label="Posição do áudio"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
              tabIndex={0}
              onClick={seekFromBar}
              className="cursor-pointer py-1.5"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--border-soft)]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SCRUB_GRADIENT }} />
              </div>
            </div>
            <div className="flex justify-between text-[0.6875rem] tabular-nums text-[color:var(--text-muted)]">
              <span>{fmt(sync.currentTime)}</span>
              <span>{sync.duration > 0 ? fmt(sync.duration) : "--:--"}</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={sync.cycleRate}
              aria-label={`Velocidade ${sync.rate}x`}
              disabled={audioOff}
              className="absolute left-0 rounded-full border border-[color:var(--border-soft)] px-2.5 py-1 text-[0.75rem] font-bold tabular-nums text-[color:var(--text-secondary)] disabled:opacity-40"
            >
              {sync.rate}x
            </button>

            <button
              type="button"
              onClick={() => prevNum != null && router.push(`/app/conteudo/trilha/${prevNum}` as Route)}
              aria-label="Módulo anterior"
              disabled={prevNum == null}
              className="text-[color:var(--text-secondary)] transition-opacity disabled:opacity-25"
            >
              <SkipBack size={24} aria-hidden />
            </button>

            <button
              type="button"
              onClick={sync.toggle}
              aria-label={sync.playing ? "Pausar" : "Tocar"}
              disabled={audioOff}
              className="grid h-16 w-16 place-items-center rounded-full text-white disabled:opacity-50"
              style={{ background: BRAND_GRADIENT, boxShadow: "0 12px 30px -6px rgba(186, 87, 23, 0.45)" }}
            >
              {sync.playing ? <Pause size={26} aria-hidden /> : <Play size={26} className="ml-0.5" aria-hidden />}
            </button>

            <button
              type="button"
              onClick={() => nextNum != null && router.push(`/app/conteudo/trilha/${nextNum}` as Route)}
              aria-label="Próximo módulo"
              disabled={!sync.ended || nextNum == null}
              className="text-[color:var(--text-secondary)] transition-opacity disabled:opacity-25"
            >
              <SkipForward size={24} aria-hidden />
            </button>
          </div>

          {audioOff ? (
            <div className="text-center text-[0.6875rem] text-[color:var(--text-muted)]">Áudio em breve</div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mounted ? createPortal(overlay, document.body) : null}
      {audioSrc ? <audio ref={sync.audioRef} src={audioSrc} preload="metadata" /> : null}
    </>
  );
}
