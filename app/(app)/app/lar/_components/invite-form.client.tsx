"use client";

import { UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { inviteMemberAction } from "../../_actions/household-actions";

interface InviteFormProps {
  householdId: string;
  onSuccess?: () => void;
}

export function InviteForm({ householdId, onSuccess }: InviteFormProps) {
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = ref.trim();
    if (!trimmed) {
      setError("Informe o @usuário ou e-mail.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await inviteMemberAction({ householdId, inviteeRef: trimmed });
      if (!result.ok) {
        setError(result.message);
      } else {
        setRef("");
        setSuccess("Convite enviado.");
        onSuccess?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
        Convidar pessoa
      </h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="@usuário ou e-mail"
          disabled={pending}
          className="focus-ring min-w-0 flex-1 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.875rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] disabled:opacity-50"
        />
        <Button type="submit" size="sm" loading={pending} className="gap-2 shrink-0">
          <UserPlus size={14} strokeWidth={2} aria-hidden />
          Convidar
        </Button>
      </div>
      {error ? (
        <p className="text-[0.75rem] font-semibold text-[color:var(--semantic-negative)]">{error}</p>
      ) : null}
      {success ? (
        <p className="text-[0.75rem] font-semibold text-[color:var(--semantic-positive)]">{success}</p>
      ) : null}
    </form>
  );
}
