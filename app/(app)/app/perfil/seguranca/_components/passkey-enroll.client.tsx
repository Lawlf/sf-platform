"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useTransition } from "react";
import { toast } from "sonner";

import { beginPasskeyEnrollAction, confirmPasskeyEnrollAction } from "../_actions/enroll";

export function PasskeyEnroll() {
  const [pending, start] = useTransition();

  function handleRegister() {
    start(async () => {
      let options;
      try {
        options = await beginPasskeyEnrollAction();
      } catch {
        toast.error("Erro ao iniciar registro de passkey.");
        return;
      }

      let response;
      try {
        response = await startRegistration({ optionsJSON: options });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Operação cancelada.";
        toast.error("Registro cancelado.", { description: msg });
        return;
      }

      const result = await confirmPasskeyEnrollAction(response);
      if (result.ok) {
        toast.success("Passkey registrada com sucesso.");
      } else {
        toast.error(result.message ?? "Falha ao registrar passkey.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleRegister}
      disabled={pending}
      className="focus-ring self-start rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2 text-[0.875rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)] disabled:opacity-60"
    >
      {pending ? "Registrando..." : "Registrar passkey"}
    </button>
  );
}
