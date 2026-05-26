"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/button";

interface TotpChallengeProps {
  onSubmit: (code: string) => Promise<{ ok: boolean; message?: string }>;
  onSuccess: () => void;
}

export function TotpChallenge({ onSubmit, onSuccess }: TotpChallengeProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await onSubmit(code);
      if (res.ok) onSuccess();
      else setError(res.message ?? "Código inválido.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending && /^\d{6}$/.test(code)) void submit();
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={code}
        disabled={pending}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
          setError(null);
        }}
        className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-3 text-center text-2xl tracking-[0.5em] text-[color:var(--text-primary)] outline-none focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30 disabled:opacity-70"
      />
      {error ? <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">{error}</p> : null}
      <Button type="submit" variant="brand" loading={pending} disabled={!/^\d{6}$/.test(code)}>
        Confirmar código
      </Button>
    </form>
  );
}
