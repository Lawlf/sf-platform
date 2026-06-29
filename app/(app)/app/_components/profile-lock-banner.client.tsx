"use client";

import { ArrowRight, Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

function daysLeft(graceUntilIso: string | null): number {
  if (!graceUntilIso) return 0;
  return Math.max(0, Math.ceil((new Date(graceUntilIso).getTime() - Date.now()) / 86_400_000));
}

export function ProfileLockBanner({
  inGrace,
  hasLocked,
  graceUntilIso,
}: {
  inGrace: boolean;
  hasLocked: boolean;
  graceUntilIso: string | null;
}) {
  if (!inGrace && !hasLocked) return null;

  const days = daysLeft(graceUntilIso);
  const title = inGrace ? "Escolha qual perfil fica ativo no Free" : "Você tem um perfil guardado";
  const body = inGrace
    ? days > 0
      ? `Você tem ${days} ${days === 1 ? "dia" : "dias"}. Depois, um perfil fica ativo e os outros guardados, com tudo dentro.`
      : "Um perfil fica ativo e os outros guardados, com tudo dentro. Nada é apagado."
    : "No Free você usa um por vez. Volte pro Pro pra usar mais de um ao mesmo tempo.";

  return (
    <div className="px-4 pt-4 md:px-6">
      <Link
        href={"/app/configuracoes/perfis" as Route}
        className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg,#f28e25,#ef7a1a)" }}
        >
          <Lock size={16} strokeWidth={2.2} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            {title}
          </span>
          <span className="text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">{body}</span>
        </span>
        <ArrowRight size={16} strokeWidth={2.25} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
      </Link>
    </div>
  );
}
