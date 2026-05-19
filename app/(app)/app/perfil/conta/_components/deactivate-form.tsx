"use client";

import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";

import { deactivateAccountAction } from "../_actions/deactivate-account.action";

export function DeactivateForm() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      await deactivateAccountAction(formData);
    });
  }

  if (!confirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
        Quero desativar minha conta
      </Button>
    );
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Motivo (opcional)</span>
        <textarea
          name="reason"
          rows={3}
          maxLength={500}
          placeholder="Conte por que esta saindo..."
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Desativando..." : "Confirmar desativacao"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
