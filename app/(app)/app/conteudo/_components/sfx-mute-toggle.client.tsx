"use client";

import { Volume2, VolumeX } from "lucide-react";

import { useSfxMuted } from "../_lib/use-sfx-muted";

export function SfxMuteToggle() {
  const [muted, toggle] = useSfxMuted();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Ativar sons" : "Silenciar sons"}
      className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]"
    >
      {muted ? <VolumeX size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
    </button>
  );
}
