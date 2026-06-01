"use client";

import { useEffect, useState } from "react";

import { PasskeyChallenge } from "@/app/components/auth/passkey-challenge.client";
import { TotpChallenge } from "@/app/components/auth/totp-challenge.client";
import { Button } from "@/app/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import { beginStepUpPasskeyAction, confirmStepUpPasskeyAction, getStepUpFactorsAction, stepUpPinAction, stepUpTotpAction } from "./step-up.actions";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; onConfirmed: () => void; title?: string; }

export function StepUpGate({ open, onOpenChange, onConfirmed, title = "Confirme sua identidade" }: Props) {
  const [factors, setFactors] = useState<{ hasTotp: boolean; hasPasskey: boolean; hasPin: boolean } | null>(null);
  const [pin, setPin] = useState(""); const [err, setErr] = useState<string | null>(null); const [p, setP] = useState(false);
  useEffect(() => { if (open && !factors) void getStepUpFactorsAction().then(setFactors); }, [open, factors]);
  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setFactors(null); setPin(""); setErr(null); } }}>
      <SheetContent side="bottom" className="flex flex-col gap-5">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Esta ação é sensível. Confirme com passkey, código ou PIN.</SheetDescription>
        </SheetHeader>
        {!factors ? <div className="flex justify-center py-4"><Spinner size={20} /></div> : (
          <div className="flex flex-col gap-4">
            {factors.hasPasskey ? <PasskeyChallenge begin={beginStepUpPasskeyAction} confirm={confirmStepUpPasskeyAction} onSuccess={onConfirmed} /> : null}
            {factors.hasTotp ? <TotpChallenge onSubmit={stepUpTotpAction} onSuccess={onConfirmed} /> : null}
            {factors.hasPin ? (
              <form className="flex flex-col gap-2" onSubmit={async (e) => {
                e.preventDefault(); if (p || !/^\d{4}$/.test(pin)) return; setP(true); setErr(null);
                try { const r = await stepUpPinAction(pin); if (r.ok) onConfirmed(); else { setErr(r.message ?? "PIN incorreto."); setPin(""); } } finally { setP(false); }
              }}>
                <input type="password" inputMode="numeric" maxLength={4} placeholder="PIN" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0,4)); setErr(null); }} className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-3 text-center tracking-[0.5em]" />
                {err ? <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">{err}</p> : null}
                <Button type="submit" variant="outline" loading={p} disabled={!/^\d{4}$/.test(pin)}>Confirmar com PIN</Button>
              </form>
            ) : null}
            {!factors.hasPasskey && !factors.hasTotp && !factors.hasPin ? (
              <p className="text-sm text-[color:var(--text-muted)]">Cadastre uma passkey, TOTP ou PIN em Segurança para confirmar ações sensíveis.</p>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
