"use client";

import { Download } from "lucide-react";

import { useInstall } from "./install-context";

export function InstallSettingsButton() {
  const ctx = useInstall();
  if (!ctx || !ctx.env) return null;

  const env = ctx.env;
  const isMobile = env.os === "ios" || env.os === "android";
  if (env.standalone || !isMobile) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        Aplicativo
      </h2>
      <button
          type="button"
          onClick={() => ctx.promptInstall("settings")}
          className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-left backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Download size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="flex-1">
            <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
              Instalar na tela inicial
            </div>
            <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
              Abre o Sabor direto da tela do seu celular, sem passar pelo navegador.
            </div>
          </div>
        </button>
    </section>
  );
}
