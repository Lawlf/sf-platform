"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/app/components/ui/spinner";

import { useInstall } from "./pwa/install-context";
import { subscribePush } from "../perfil/notificacoes/_lib/subscribe-push";

const DISMISS_KEY = "sf_push_due_nudge_dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    return;
  }
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

interface Props {
  isPro: boolean;
  hasDueDatedDebt: boolean;
}

export function EnableDuePushNudge({ isPro, hasDueDatedDebt }: Props) {
  const install = useInstall();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isPro || !hasDueDatedDebt) return;
    if (readDismissed()) return;

    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    if (!supported) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) setVisible(true);
      })
      .catch(() => undefined);
  }, [isPro, hasDueDatedDebt]);

  function dismiss() {
    writeDismissed();
    setVisible(false);
  }

  async function activate() {
    const env = install?.env;

    if (env?.os === "ios" && !env.standalone) {
      install?.openIosSheet("push_due_nudge");
      dismiss();
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
      dismiss();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha ao ativar: ${msg}`);
    } finally {
      setPending(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.12] text-[color:var(--color-brand-800)]">
          <Bell size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Quer ser avisado quando uma conta vencer?
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Ative as notificações neste aparelho.
          </p>
          <button
            type="button"
            onClick={activate}
            disabled={pending}
            aria-busy={pending}
            className="sf-lift focus-ring mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 text-[0.8125rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] disabled:opacity-60"
          >
            {pending ? <Spinner size={14} decorative /> : "Ativar neste aparelho"}
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="focus-ring flex h-7 w-7 flex-none items-center justify-center rounded-full text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
