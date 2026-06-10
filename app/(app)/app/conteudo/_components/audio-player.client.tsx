"use client";

import { ChevronLeft, Pause, Play } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState } from "react";

export function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  return (
    <nav
      aria-label="Player do módulo"
      className="fixed bottom-2 left-2 right-2 z-20 mx-auto flex max-w-md items-center gap-3 rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5 backdrop-blur-xl md:hidden"
      style={{ boxShadow: "0 16px 40px -8px rgba(31,29,28,0.12)" }}
    >
      <Link
        href={"/app/conteudo/trilha" as Route}
        aria-label="Voltar para a trilha"
        className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-[color:var(--text-secondary)]"
      >
        <ChevronLeft size={18} aria-hidden />
      </Link>

      {failed ? (
        <span className="flex-1 text-[0.75rem] text-[color:var(--text-muted)]">Áudio em breve</span>
      ) : (
        <>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar narração" : "Tocar narração"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--color-brand-500)] text-white"
          >
            {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--border-soft)]">
            <div
              className="h-full rounded-full bg-[color:var(--color-brand-500)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}

      <audio
        ref={ref}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setPct(el.duration ? (el.currentTime / el.duration) * 100 : 0);
        }}
      />
    </nav>
  );
}
