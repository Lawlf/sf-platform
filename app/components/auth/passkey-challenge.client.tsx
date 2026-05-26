"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";

interface PasskeyChallengeProps {
  begin: () => Promise<PublicKeyCredentialRequestOptionsJSON>;
  confirm: (resp: AuthenticationResponseJSON) => Promise<{ ok: boolean; message?: string }>;
  onSuccess: () => void;
  label?: string;
}

export function PasskeyChallenge({ begin, confirm, onSuccess, label = "Usar passkey" }: PasskeyChallengeProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const optionsJSON = await begin();
      const resp = await startAuthentication({ optionsJSON });
      const res = await confirm(resp);
      if (res.ok) onSuccess();
      else setError(res.message ?? "Falha na verificação.");
    } catch {
      setError("Não foi possível usar a passkey.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" loading={pending} onClick={() => void run()}>
        {label}
      </Button>
      {error ? <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">{error}</p> : null}
    </div>
  );
}
