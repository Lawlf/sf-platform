"use client";

import { useEffect, useState } from "react";

import type { Beat } from "../_lib/beats";

export function BeatStage({ beats, beatIndex }: { beats: readonly Beat[]; beatIndex: number }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {beats.map((b, i) => {
        const active = i === beatIndex;
        const Visual = b.Visual;
        return (
          <div
            key={i}
            aria-hidden={!active}
            className={`absolute inset-0 flex flex-col px-6 ${active ? "opacity-100" : "opacity-0"} ${
              reduceMotion ? "" : "transition-opacity duration-500"
            }`}
          >
            <Visual />
          </div>
        );
      })}
    </div>
  );
}
