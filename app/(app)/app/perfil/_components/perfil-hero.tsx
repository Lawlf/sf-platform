"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";

import { updateDisplayNameAction } from "../_actions/update-display-name.action";

export interface PerfilHeroProps {
  initialDisplayName: string;
  email: string;
}

export function PerfilHero({ initialDisplayName, email }: PerfilHeroProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const initials = (displayName || "??").slice(0, 2).toUpperCase();

  function startEdit() {
    setDraft(displayName);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(displayName);
    setError(null);
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setError("Nome deve ter entre 1 e 120 caracteres.");
      return;
    }
    const fd = new FormData();
    fd.set("displayName", trimmed);
    startTransition(async () => {
      const result = await updateDisplayNameAction(fd);
      if (result.ok) {
        setDisplayName(trimmed);
        setEditing(false);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <section className="glass-tier-1 relative overflow-hidden p-[22px]">
      <div
        className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-white/[0.12]"
        aria-hidden
      />
      <div className="relative flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-extrabold backdrop-blur-sm">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={120}
                placeholder="Seu nome"
                aria-label="Nome do perfil"
                autoFocus
                className="w-full rounded-xl border border-white/40 bg-white/20 px-3 py-2 text-[1.25rem] font-extrabold tracking-tight text-white outline-none placeholder:text-white/60 focus:border-white"
              />
              {error ? <span className="text-[0.6875rem] text-white/95">{error}</span> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-white/30 px-3 py-1.5 text-[0.75rem] font-bold backdrop-blur-sm transition-colors hover:bg-white/45 disabled:opacity-50"
                >
                  <Check size={12} strokeWidth={2.5} aria-hidden />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={pending}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[0.75rem] font-bold backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  <X size={12} strokeWidth={2.5} aria-hidden />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[1.5rem] font-extrabold leading-tight tracking-tight">
                  {displayName || "Sem nome"}
                </h2>
                <button
                  type="button"
                  onClick={startEdit}
                  aria-label="Editar nome"
                  className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <Pencil size={12} strokeWidth={2} aria-hidden />
                </button>
              </div>
              <div className="mt-1 truncate text-[0.75rem] opacity-90">{email}</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
