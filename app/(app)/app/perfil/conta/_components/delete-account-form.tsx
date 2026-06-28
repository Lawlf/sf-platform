"use client";

import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { deleteAccountAction } from "../_actions/delete-account.action";

export function DeleteAccountForm({ email }: { email: string }) {
  const [step, setStep] = useState<"idle" | "confirming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction(formData);
      if (result && !result.ok) {
        setError(result.message);
      }
    });
  }

  if (step === "idle") {
    return (
      <Button type="button" variant="destructive" onClick={() => setStep("confirming")}>
        Excluir minha conta
      </Button>
    );
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
        Isso apaga sua conta e todos os dados permanentemente. Não tem como desfazer.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
          Digite seu email para confirmar: <span className="font-bold">{email}</span>
        </span>
        <input
          name="email"
          type="email"
          autoComplete="off"
          placeholder={email}
          required
          className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.875rem] outline-none focus:border-[color:var(--semantic-negative)] focus:ring-2 focus:ring-[color:var(--semantic-negative)]/30"
        />
      </label>
      {error ? (
        <p className="text-[0.8125rem] font-medium text-[color:var(--semantic-negative)]">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" loading={pending}>
          Excluir permanentemente
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => { setStep("idle"); setError(null); }}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
