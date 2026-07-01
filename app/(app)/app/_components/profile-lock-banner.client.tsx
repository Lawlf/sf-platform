"use client";

import { ChevronRight, Lock, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "sf_profile_lock_dismissed";

function daysLeft(graceUntilIso: string | null): number {
  if (!graceUntilIso) return 0;
  return Math.max(0, Math.ceil((new Date(graceUntilIso).getTime() - Date.now()) / 86_400_000));
}

export function ProfileLockBanner({
  inGrace,
  hasLocked,
  graceUntilIso,
  choiceMade,
}: {
  inGrace: boolean;
  hasLocked: boolean;
  graceUntilIso: string | null;
  choiceMade: boolean;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Na graça, o aviso só faz sentido até o usuário escolher qual perfil fica.
  const showGrace = inGrace && !choiceMade;
  // Pós-graça é upsell, não obrigação: pode ser dispensado.
  const showLocked = !inGrace && hasLocked && !dismissed;

  if (!showGrace && !showLocked) return null;

  const days = daysLeft(graceUntilIso);
  const title = showGrace ? "Escolha qual perfil fica ativo no Free" : "Você tem um perfil guardado";
  const body = showGrace
    ? days > 0
      ? `Você tem ${days} ${days === 1 ? "dia" : "dias"}. Depois, um perfil fica ativo e os outros guardados, com tudo dentro.`
      : "Um perfil fica ativo e os outros guardados, com tudo dentro. Nada é apagado."
    : "No Free você usa um por vez. Volte pro Pro pra usar mais de um ao mesmo tempo.";

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="px-4 pt-4 md:px-6">
      <div className="relative flex items-center gap-3 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] pl-4 pr-11 py-3">
        <Link
          href={"/app/configuracoes/perfis" as Route}
          className="focus-ring absolute inset-0 rounded-2xl transition-colors hover:bg-[color:var(--surface-2)]"
          aria-label={title}
        />
        <span
          className="relative flex h-9 w-9 flex-none items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg,#f28e25,#ef7a1a)" }}
        >
          <Lock size={16} strokeWidth={2.2} aria-hidden />
        </span>
        <span className="relative flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            {title}
          </span>
          <span className="text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">{body}</span>
        </span>
        {showLocked ? (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dispensar aviso"
            className="focus-ring absolute right-2.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <ChevronRight
            size={18}
            strokeWidth={2}
            aria-hidden
            className="absolute right-4 top-1/2 -translate-y-1/2 flex-none text-[color:var(--text-muted)]"
          />
        )}
      </div>
    </div>
  );
}
