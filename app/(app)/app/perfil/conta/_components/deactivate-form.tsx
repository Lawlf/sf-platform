"use client";

import { useRef, useState, useTransition } from "react";

import { StepUpGate } from "@/app/(app)/app/_components/step-up/step-up-gate.client";
import { Button } from "@/app/components/ui/button";

import { deactivateAccountAction } from "../_actions/deactivate-account.action";

export function DeactivateForm() {
  const [confirming, setConfirming] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formDataRef = useRef<FormData | null>(null);

  async function onSubmit(formData: FormData) {
    formDataRef.current = formData;
    startTransition(async () => {
      const r = await deactivateAccountAction(formData);
      if (r && !r.ok && r.code === "STEPUP_REQUIRED") {
        setStepUpOpen(true);
      }
      // If ok=true the action redirects, so nothing more to do here.
    });
  }

  function handleStepUpConfirmed() {
    setStepUpOpen(false);
    if (!formDataRef.current) return;
    const fd = formDataRef.current;
    startTransition(async () => {
      await deactivateAccountAction(fd);
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
    <>
      <form action={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Motivo (opcional)</span>
          <textarea
            name="reason"
            rows={3}
            maxLength={500}
            placeholder="Conte por que esta saindo..."
            className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" loading={pending}>
            Confirmar desativacao
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
      <StepUpGate
        open={stepUpOpen}
        onOpenChange={setStepUpOpen}
        onConfirmed={handleStepUpConfirmed}
        title="Confirme para desativar conta"
      />
    </>
  );
}
