"use client";

import { ShieldCheck } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PasskeyChallenge } from "@/app/components/auth/passkey-challenge.client";
import { TotpChallenge } from "@/app/components/auth/totp-challenge.client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import {
  beginPasskeyStepUpAction,
  confirmPasskeyStepUpAction,
  getAdminFactorsAction,
  verifyTotpStepUpAction,
} from "../_actions/admin-stepup";

export function AdminPanelButton({ autoOpen = false }: { autoOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [factors, setFactors] = useState<{ hasTotp: boolean; hasPasskey: boolean } | null>(null);

  useEffect(() => {
    if (open && !factors) void getAdminFactorsAction().then(setFactors);
  }, [open, factors]);

  function goToPanel() {
    router.push("/admin" as Route);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-left transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <ShieldCheck size={18} className="text-[color:var(--color-brand-800)]" aria-hidden />
        <span className="flex-1">
          <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            Painel admin
          </span>
          <span className="block text-[0.75rem] text-[color:var(--text-muted)]">
            Requer confirmação de identidade.
          </span>
        </span>
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setFactors(null); // re-fetch on next open so newly enrolled factors show
        }}
      >
        <SheetContent side="bottom" className="flex flex-col gap-5">
          <SheetHeader>
            <SheetTitle>Desbloquear painel admin</SheetTitle>
            <SheetDescription>Confirme com TOTP ou passkey para continuar.</SheetDescription>
          </SheetHeader>

          {!factors ? (
            <div className="flex justify-center py-4"><Spinner size={20} /></div>
          ) : (
            <div className="flex flex-col gap-4">
              {factors.hasPasskey ? (
                <PasskeyChallenge
                  begin={beginPasskeyStepUpAction}
                  confirm={confirmPasskeyStepUpAction}
                  onSuccess={goToPanel}
                />
              ) : null}
              {factors.hasTotp ? (
                <TotpChallenge onSubmit={verifyTotpStepUpAction} onSuccess={goToPanel} />
              ) : null}
              {!factors.hasTotp && !factors.hasPasskey ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  Nenhum fator configurado. Cadastre um em Segurança.
                </p>
              ) : null}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
