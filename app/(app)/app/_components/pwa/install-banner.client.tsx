"use client";

import { Download, X } from "lucide-react";

import { useInstall } from "./install-context";

export function InstallBanner() {
  const ctx = useInstall();
  if (!ctx || !ctx.bannerVisible) return null;

  const ctaLabel = ctx.canPromptNative ? "Instalar na tela" : "Te mostro como";

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4 shadow-[0_20px_50px_-20px_rgba(31,29,28,0.45)] backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:mx-0">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Download size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
            Seu mês, sempre à mão
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Instala na tela inicial e volta todo mês pra ver patrimônio, dívida e renda.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => ctx.promptInstall("dashboard_banner")}
              className="sf-lift focus-ring inline-flex h-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 text-[0.8125rem] font-bold text-white shadow-[0_8px_18px_-8px_rgba(239,122,26,0.5)]"
            >
              {ctaLabel}
            </button>
            <button
              type="button"
              onClick={() => ctx.dismissBanner()}
              className="focus-ring inline-flex h-9 items-center justify-center rounded-full px-3 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => ctx.dismissBanner()}
          aria-label="Fechar"
          className="focus-ring flex h-7 w-7 flex-none items-center justify-center rounded-full text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
