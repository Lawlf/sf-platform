"use client";

import { Smartphone, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useInstall } from "./install-context";
import { VALUE_MOMENT_EVENT } from "./install-provider.client";
import { markSidebarInstallDismissed, readPersisted } from "./storage";

function buildTarget(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/app`;
}

export function InstallSidebarNudge({ collapsed }: { collapsed: boolean }) {
  const ctx = useInstall();
  const [eligible, setEligible] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [target, setTarget] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const isDesktop = ctx?.env?.os === "other";
  const standalone = ctx?.env?.standalone ?? false;

  useEffect(() => {
    if (!isDesktop || standalone) return;

    function recompute() {
      const p = readPersisted();
      const triggerReady = p.valueMoment || p.sessionCount >= 2;
      setEligible(!p.installed && !p.sidebarInstallDismissed && triggerReady);
    }

    recompute();
    setTarget(buildTarget());
    window.addEventListener(VALUE_MOMENT_EVENT, recompute);
    return () => window.removeEventListener(VALUE_MOMENT_EVENT, recompute);
  }, [isDesktop, standalone]);

  useEffect(() => {
    if (!popoverOpen) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopoverOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPopoverOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [popoverOpen]);

  const dismiss = useCallback(() => {
    markSidebarInstallDismissed();
    setEligible(false);
    setPopoverOpen(false);
  }, []);

  if (!eligible || !target) return null;

  const qr = (
    <QRCodeSVG value={target} size={52} bgColor="#ffffff" fgColor="#1f1d1c" level="M" />
  );

  const card = (
    <div className="relative rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.06] p-3">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        className="focus-ring absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
      >
        <X size={13} strokeWidth={2} aria-hidden />
      </button>
      <div className="flex items-center gap-3">
        <span className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-lg bg-white p-1">
          {qr}
        </span>
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
            Leve pro celular
          </p>
          <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-[color:var(--text-muted)]">
            Aponte a câmera do celular no código e use o Sabor no telefone também.
          </p>
        </div>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div ref={ref} className="relative mt-2 flex-none">
        {popoverOpen ? (
          <div className="absolute bottom-0 left-[calc(100%+0.5rem)] z-40 w-64 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-solid)] p-2 shadow-[0_24px_50px_-16px_rgba(31,29,28,0.4)]">
            {card}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setPopoverOpen((v) => !v)}
          aria-label="Levar pro celular"
          aria-expanded={popoverOpen}
          className="focus-ring flex w-full items-center justify-center rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.08] p-2 text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.14]"
        >
          <Smartphone size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex-none">{card}</div>
  );
}
