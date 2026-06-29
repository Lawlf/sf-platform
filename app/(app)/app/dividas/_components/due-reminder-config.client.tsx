"use client";

import { Crown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/app/components/ui/spinner";

import { useInstall } from "../../_components/pwa/install-context";
import { subscribePush } from "../../perfil/notificacoes/_lib/subscribe-push";

import { DebtDuePushToggle } from "./debt-due-push-toggle.client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const SCOPE_NOTE =
  'Para colocar um vencimento específico na sua agenda, abra a dívida e use "adicionar ao calendário".';

interface Props {
  isPro: boolean;
  initialEnabled: boolean;
  initialDaysBefore: number;
}

export function DueReminderConfig({ isPro, initialEnabled, initialDaysBefore }: Props) {
  if (!isPro) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-[color:var(--surface-2)] p-3">
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          Os vencimentos já aparecem aqui. No Pro, o lembrete chega no seu celular sem você abrir o
          app.
        </p>
        <Link
          href={"/app/configuracoes/planos" as Route}
          className="focus-ring inline-flex w-fit items-center gap-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
        >
          Virar Pro
          <Crown size={13} strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DebtDuePushToggle
        initialEnabled={initialEnabled}
        initialDaysBefore={initialDaysBefore}
        scopeNote={SCOPE_NOTE}
      />
      <DeviceActivation />
    </div>
  );
}

function DeviceActivation() {
  const install = useInstall();
  const [needsActivation, setNeedsActivation] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    if (!supported) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setNeedsActivation(!sub))
      .catch(() => undefined);
  }, []);

  if (!needsActivation) return null;

  async function activate() {
    const env = install?.env;
    if (env?.os === "ios" && !env.standalone) {
      install?.openIosSheet("push_due_nudge");
      return;
    }

    setPending(true);
    try {
      const res = await subscribePush(VAPID_PUBLIC_KEY);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Notificações ativadas neste aparelho.");
      setNeedsActivation(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha ao ativar: ${msg}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-4">
      <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Este aparelho ainda não recebe os avisos. Ative pra o lembrete chegar aqui.
      </p>
      <button
        type="button"
        onClick={activate}
        disabled={pending}
        aria-busy={pending}
        className="sf-lift focus-ring inline-flex h-9 w-fit items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 text-[0.8125rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] disabled:opacity-60"
      >
        {pending ? <Spinner size={14} decorative /> : "Ativar neste aparelho"}
      </button>
    </div>
  );
}
