"use client";

import { useTransition } from "react";

import { completeModuleAction } from "../_actions/complete-module.action";
import { playSfx } from "../_lib/sfx";
import { useSfxMuted } from "../_lib/use-sfx-muted";

export function CompleteModuleButton({
  moduleNum,
  isLastOfTrilha,
  compact = false,
}: {
  moduleNum: number;
  isLastOfTrilha: boolean;
  compact?: boolean;
}) {
  const [muted] = useSfxMuted();
  const [pending, startTransition] = useTransition();

  function complete() {
    playSfx(isLastOfTrilha ? "trilha-complete" : "module-complete", { muted });
    const fd = new FormData();
    fd.set("moduleNum", String(moduleNum));
    startTransition(async () => {
      await completeModuleAction(fd);
    });
  }

  const cls = compact
    ? "inline-flex items-center justify-center rounded-full bg-[color:var(--color-brand-500)] px-4 py-2 text-[0.75rem] font-bold text-white disabled:opacity-60"
    : "mt-4 inline-flex items-center justify-center rounded-full bg-[color:var(--color-brand-500)] px-5 py-2.5 text-[0.8125rem] font-bold text-white disabled:opacity-60";

  return (
    <button type="button" onClick={complete} disabled={pending} className={cls}>
      Concluir módulo
    </button>
  );
}
