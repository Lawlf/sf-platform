"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";

import { updateDisplayNameAction } from "../../_actions/update-display-name.action";

export interface AccountNameFormProps {
  initialDisplayName: string;
}

export function AccountNameForm({ initialDisplayName }: AccountNameFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={120}
          placeholder="Seu nome"
          aria-label="Nome do perfil"
          autoFocus
          className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[15px] font-semibold text-[color:var(--text-primary)] outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
        {error ? <span className="text-[12px] text-[color:var(--semantic-negative)]">{error}</span> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[color:var(--color-brand-500)] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[color:var(--color-brand-600)] disabled:opacity-50"
          >
            <Check size={12} strokeWidth={2.5} aria-hidden />
            Salvar
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[color:var(--surface-2)] px-3 py-1.5 text-[12px] font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)] disabled:opacity-50"
          >
            <X size={12} strokeWidth={2.5} aria-hidden />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="truncate text-[15px] font-semibold text-[color:var(--text-primary)]">
        {displayName || "Sem nome"}
      </span>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Editar nome"
        className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[color:var(--surface-2)] px-2.5 py-1.5 text-[12px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
      >
        <Pencil size={12} strokeWidth={2} aria-hidden />
        Editar
      </button>
    </div>
  );
}
