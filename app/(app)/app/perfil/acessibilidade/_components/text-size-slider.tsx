"use client";

import { useState, useTransition } from "react";

import { savePrefAction } from "../_actions/save-pref.action";

const STOPS = ["14", "15", "16", "17", "18", "20"] as const;

export function TextSizeSlider({ current }: { current: string }) {
  const [value, setValue] = useState(STOPS.includes(current as (typeof STOPS)[number]) ? current : "16");
  const [, startTransition] = useTransition();
  const idx = Math.max(0, STOPS.indexOf(value as (typeof STOPS)[number]));

  // Aplica ao vivo em cada passo (sem salvar) para preview suave ao arrastar.
  function preview(nextIdx: number) {
    const next = STOPS[nextIdx] ?? "16";
    setValue(next);
    document.documentElement.style.fontSize = `${next}px`;
  }

  // Persiste só ao soltar (release), evitando uma gravação por passo.
  function persist() {
    startTransition(async () => {
      await savePrefAction("textsize", value);
    });
  }

  return (
    <div>
      <div className="mb-2 flex justify-between px-0.5">
        {STOPS.map((stop) => (
          <span
            key={stop}
            className={`text-[0.6875rem] font-bold ${
              stop === value
                ? "text-[color:var(--color-brand-700)]"
                : "text-[color:var(--text-muted)]"
            }`}
          >
            {stop}
          </span>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={STOPS.length - 1}
        step={1}
        value={idx}
        onChange={(e) => preview(Number(e.target.value))}
        onPointerUp={persist}
        onKeyUp={persist}
        aria-label="Tamanho do texto em pixels"
        aria-valuetext={`${value} pixels`}
        className="h-6 w-full cursor-pointer accent-[color:var(--color-brand-500)]"
      />
    </div>
  );
}
