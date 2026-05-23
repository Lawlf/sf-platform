"use client";

import { Bell, BellOff, Crown, Lock, Mail, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { sendTestPushAction } from "../_actions/send-test-push.action";
import { subscribePushAction } from "../_actions/subscribe-push.action";
import { unsubscribePushAction } from "../_actions/unsubscribe-push.action";
import { updateNotificationPreferencesAction } from "../_actions/update-preferences.action";

interface Prefs {
  pushEnabled: boolean;
  emailEnabled: boolean;
  debtDueEnabled: boolean;
  assetPriceEnabled: boolean;
  monthlySummaryEnabled: boolean;
  promotionsEnabled: boolean;
  newsEnabled: boolean;
  newsletterEnabled: boolean;
}

type Channel = "push" | "email";

interface Props {
  isPro: boolean;
  vapidPublicKey: string;
  initialPrefs: Prefs;
  deviceCount: number;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function NotificationSettings({
  isPro,
  vapidPublicKey,
  initialPrefs,
  deviceCount,
}: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [devices, setDevices] = useState(deviceCount);
  const [pending, startTransition] = useTransition();
  const [subscribing, setSubscribing] = useState(false);
  const [testing, setTesting] = useState(false);

  const supported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  async function enablePushOnDevice() {
    if (!supported) {
      toast.error("Push não é suportado neste navegador.");
      return;
    }
    if (!vapidPublicKey) {
      toast.error("VAPID public key não configurada.");
      return;
    }
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permissão negada. Habilite nas configurações do navegador.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
      const auth = arrayBufferToBase64(subscription.getKey("auth"));
      const res = await subscribePushAction({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setDevices((d) => d + 1);
      toast.success("Notificações ativadas neste device.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha ao ativar: ${msg}`);
    } finally {
      setSubscribing(false);
    }
  }

  async function disablePushOnDevice() {
    if (!supported) return;
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        toast.info("Nenhuma subscription ativa neste device.");
        return;
      }
      const res = await unsubscribePushAction({ endpoint: subscription.endpoint });
      await subscription.unsubscribe();
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setDevices((d) => Math.max(0, d - 1));
      toast.success("Notificações desativadas neste device.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha ao desativar: ${msg}`);
    } finally {
      setSubscribing(false);
    }
  }

  function togglePref(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    startTransition(async () => {
      const res = await updateNotificationPreferencesAction(next);
      if (!res.ok) {
        setPrefs(prefs);
        toast.error(res.message);
      }
    });
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await sendTestPushAction();
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (res.skipped) {
        toast.info("Push pulado: master switch desativado.");
        return;
      }
      if (res.delivered === 0) {
        toast.info("Nenhum device ativo. Ative as notificações primeiro.");
        return;
      }
      toast.success(
        res.delivered === 1
          ? "Enviado para 1 device."
          : `Enviado para ${res.delivered} devices.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Falha no teste: ${msg}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Dispositivo: só Pro pode ativar push real. */}
      {isPro ? (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.12]">
                {devices > 0 ? (
                  <Bell size={20} className="text-[color:var(--color-brand-700)]" aria-hidden />
                ) : (
                  <BellOff size={20} className="text-[color:var(--text-secondary)]" aria-hidden />
                )}
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[color:var(--text-primary)]">
                  Este device
                </h2>
                <p className="text-[12px] text-[color:var(--text-secondary)]">
                  {devices === 0
                    ? "Nenhum device ativo. Ative pra receber avisos."
                    : devices === 1
                      ? "1 device ativo na sua conta."
                      : `${devices} devices ativos na sua conta.`}
                </p>
              </div>
            </div>
          </div>
          {!supported ? (
            <p className="mt-4 rounded-lg bg-[color:var(--surface-2)] px-3 py-2.5 text-[12px] text-[color:var(--text-secondary)]">
              Este navegador não suporta Web Push. No iPhone, instale o app na tela inicial
              (Compartilhar -&gt; Adicionar à Tela de Início) e tente de novo.
            </p>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={enablePushOnDevice}
                disabled={subscribing}
                className="sf-lift focus-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(239,122,26,0.5)] disabled:opacity-60"
              >
                {subscribing ? "Aguarde..." : "Ativar neste device"}
              </button>
              <button
                type="button"
                onClick={disablePushOnDevice}
                disabled={subscribing}
                className="focus-ring inline-flex h-10 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] px-4 text-[13px] font-semibold text-[color:var(--text-primary)] disabled:opacity-60"
              >
                Desativar
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <h2 className="text-[15px] font-bold text-[color:var(--text-primary)]">
          O que você quer receber
        </h2>
        <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
          {isPro
            ? "Cada tipo pode ser ligado individualmente. O badge mostra por onde a notificação chega."
            : "No Free você ajusta as gerais. O resto libera no Pro. O badge mostra por onde a notificação chega."}
        </p>

        <SectionGroup title="Geral">
          <PrefRow
            label="Promoções"
            description="Campanhas, descontos e ofertas pontuais."
            channels={["email"]}
            checked={prefs.promotionsEnabled}
            onToggle={() => togglePref("promotionsEnabled")}
            disabled={pending}
          />
          <PrefRow
            label="Novidades"
            description="Lançamento de features e conteúdos relevantes."
            channels={["push", "email"]}
            checked={prefs.newsEnabled}
            onToggle={() => togglePref("newsEnabled")}
            disabled={pending}
          />
          <PrefRow
            label="Newsletter"
            description="Dicas, análises e conteúdo educacional no seu email."
            channels={["email"]}
            checked={prefs.newsletterEnabled}
            onToggle={() => togglePref("newsletterEnabled")}
            disabled={pending}
          />
        </SectionGroup>

        <SectionGroup title="Vencimentos" showProLink={!isPro}>
          <PrefRow
            label="Vencimento de dívida"
            description="Avisa quando uma parcela está próxima de vencer."
            channels={["push", "email"]}
            checked={isPro ? prefs.debtDueEnabled : false}
            onToggle={() => togglePref("debtDueEnabled")}
            disabled={!isPro || pending}
            locked={!isPro}
          />
        </SectionGroup>

        <SectionGroup title="Resumos" showProLink={!isPro}>
          <PrefRow
            label="Resumo mensal"
            description="No início do mês, um panorama do patrimônio e dívida."
            channels={["push", "email"]}
            checked={isPro ? prefs.monthlySummaryEnabled : false}
            onToggle={() => togglePref("monthlySummaryEnabled")}
            disabled={!isPro || pending}
            locked={!isPro}
          />
          <PrefRow
            label="Resumo semanal"
            description="Toda segunda, o que mudou na sua semana."
            channels={["push", "email"]}
            checked={false}
            onToggle={() => undefined}
            disabled
            locked={!isPro}
            comingSoon={isPro}
          />
          <PrefRow
            label="Resumo diário"
            description="Pequeno digest no início do dia."
            channels={["push"]}
            checked={false}
            onToggle={() => undefined}
            disabled
            locked={!isPro}
            comingSoon={isPro}
          />
        </SectionGroup>

        <SectionGroup title="Mercado" showProLink={!isPro}>
          <PrefRow
            label="Ações da B3"
            description="Movimento relevante nos papéis que você acompanha."
            channels={["push"]}
            checked={isPro ? prefs.assetPriceEnabled : false}
            onToggle={() => togglePref("assetPriceEnabled")}
            disabled={!isPro || pending}
            locked={!isPro}
          />
          <PrefRow
            label="Criptomoeda"
            description="Variação em Bitcoin, Ethereum e altcoins acompanhadas."
            channels={["push"]}
            checked={false}
            onToggle={() => undefined}
            disabled
            locked={!isPro}
            comingSoon={isPro}
          />
          <PrefRow
            label="Fundos imobiliários"
            description="Alertas em FIIs que você registrou no patrimônio."
            channels={["push", "email"]}
            checked={false}
            onToggle={() => undefined}
            disabled
            locked={!isPro}
            comingSoon={isPro}
          />
        </SectionGroup>
      </section>

      {isPro ? (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-bold text-[color:var(--text-primary)]">
                Testar notificação
              </h2>
              <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
                Envia uma push de teste para todos seus devices ativos agora.
              </p>
            </div>
            <button
              type="button"
              onClick={sendTest}
              disabled={testing || devices === 0}
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.08] px-4 text-[13px] font-semibold text-[color:var(--color-brand-800)] disabled:opacity-50"
            >
              <Send size={14} aria-hidden />
              {testing ? "Enviando..." : "Enviar teste"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionGroup({
  title,
  showProLink,
  children,
}: {
  title: string;
  showProLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          {title}
        </h3>
        {showProLink ? (
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
          >
            Se tornar Pro
            <Crown size={12} strokeWidth={2.25} aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="mt-2 flex flex-col divide-y divide-[color:var(--border-soft)]">
        {children}
      </div>
    </div>
  );
}

function ChannelBadges({ channels }: { channels: ReadonlyArray<Channel> }) {
  if (channels.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {channels.map((ch) =>
        ch === "push" ? (
          <span
            key="push"
            title="Push"
            aria-label="Push"
            className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)]"
          >
            <Bell size={9} strokeWidth={2.5} aria-hidden />
            Push
          </span>
        ) : (
          <span
            key="email"
            title="Email"
            aria-label="Email"
            className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--text-secondary)]"
          >
            <Mail size={9} strokeWidth={2.5} aria-hidden />
            Email
          </span>
        ),
      )}
    </span>
  );
}

function PrefRow({
  label,
  description,
  channels,
  checked,
  onToggle,
  disabled,
  highlight,
  locked,
  comingSoon,
}: {
  label: string;
  description: string;
  channels?: ReadonlyArray<Channel>;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  highlight?: boolean;
  locked?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3.5",
        highlight && "pb-4",
        (locked || comingSoon) && "opacity-60",
      )}
    >
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[14px] font-semibold text-[color:var(--text-primary)]">
            {label}
          </span>
          {channels && channels.length > 0 ? <ChannelBadges channels={channels} /> : null}
          {locked ? (
            <Lock
              size={12}
              strokeWidth={2.25}
              className="text-[color:var(--text-muted)]"
              aria-hidden
            />
          ) : null}
          {comingSoon ? (
            <span className="rounded-full bg-[color:var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
              Em breve
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-[12px] text-[color:var(--text-secondary)]">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          checked
            ? "bg-[color:var(--color-brand-500)]"
            : "bg-[color:var(--surface-3)] border border-[color:var(--border-strong)]",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
