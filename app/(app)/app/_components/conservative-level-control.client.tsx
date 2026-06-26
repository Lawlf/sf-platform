"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateConservativeLevelAction } from "../_actions/conservative-level.action";

type Level = "cautious" | "normal" | "optimistic";

const OPTIONS: { value: Level; label: string; hint: string }[] = [
  { value: "cautious", label: "Cauteloso", hint: "Conta com menos da renda que varia" },
  { value: "normal", label: "Normal", hint: "Equilíbrio entre folga e segurança" },
  { value: "optimistic", label: "Otimista", hint: "Conta com a renda que varia cheia" },
];

export function ConservativeLevelControl({ current }: { current: Level }) {
  const [level, setLevel] = useState<Level>(current);
  const [, startTransition] = useTransition();

  function choose(next: Level) {
    if (next === level) return;
    const prev = level;
    setLevel(next);
    startTransition(async () => {
      const res = await updateConservativeLevelAction({ level: next });
      if (!res.ok) {
        setLevel(prev);
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            aria-pressed={level === o.value}
            className={`focus-ring rounded-xl border px-3 py-2 text-sm transition-colors ${
              level === o.value
                ? "border-[color:var(--accent)] bg-[color:var(--surface-2)]"
                : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[color:var(--text-soft)]">
        {OPTIONS.find((o) => o.value === level)?.hint}
      </p>
    </div>
  );
}
