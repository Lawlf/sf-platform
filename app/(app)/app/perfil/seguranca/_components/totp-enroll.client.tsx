"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Spinner } from "@/app/components/ui/spinner";

import { beginTotpEnrollAction, confirmTotpEnrollAction } from "../_actions/enroll";

type Phase = "idle" | "pending-confirm";

interface TotpSession {
  secret: string;
  uri: string;
}

export function TotpEnroll() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<TotpSession | null>(null);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();

  function handleBegin() {
    start(async () => {
      const result = await beginTotpEnrollAction();
      setSession(result);
      setCode("");
      setPhase("pending-confirm");
    });
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    start(async () => {
      const result = await confirmTotpEnrollAction(session.secret, code);
      if (result.ok) {
        toast.success("TOTP ativado com sucesso.");
        setPhase("idle");
        setSession(null);
        setCode("");
      } else {
        toast.error(result.message ?? "Código inválido.");
      }
    });
  }

  function handleCancel() {
    setPhase("idle");
    setSession(null);
    setCode("");
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={handleBegin}
        disabled={pending}
        className="focus-ring self-start rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2 text-[0.875rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)] disabled:opacity-60"
      >
        {pending ? <Spinner size={16} decorative /> : "Configurar TOTP"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
        <p className="mb-2 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
          1. Abra seu app autenticador (Google Authenticator, Authy, etc.) e adicione uma conta manualmente com a chave abaixo:
        </p>
        <code className="block break-all rounded-lg bg-[color:var(--surface-2)] px-3 py-2 text-[0.8125rem] font-mono text-[color:var(--text-primary)] select-all">
          {session?.secret}
        </code>
        <p className="mt-3 mb-1 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
          Ou use o URI otpauth (para importação direta):
        </p>
        <code className="block break-all rounded-lg bg-[color:var(--surface-2)] px-3 py-2 text-[0.75rem] font-mono text-[color:var(--text-muted)] select-all">
          {session?.uri}
        </code>
      </div>

      <form onSubmit={handleConfirm} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="totp-code"
            className="text-[0.75rem] font-semibold text-[color:var(--text-secondary)]"
          >
            2. Digite o código de 6 dígitos gerado pelo app:
          </label>
          <input
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoComplete="one-time-code"
            required
            disabled={pending}
            className="focus-ring w-40 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-center text-[1.125rem] font-mono tracking-widest text-[color:var(--text-primary)] disabled:opacity-60"
            placeholder="000000"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="focus-ring rounded-lg bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2 text-[0.875rem] font-bold text-white disabled:opacity-60"
          >
            {pending ? <Spinner size={16} decorative /> : "Ativar TOTP"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="focus-ring rounded-lg px-4 py-2 text-[0.875rem] text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
