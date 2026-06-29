"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { Spinner } from "@/app/components/ui/spinner";

import { setFocusMode } from "../../../_lib/focus-mode";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface WizardShellCtaProps {
  label: string;
  onClick: () => void;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  icon?: ReactNode;
}

export interface WizardShellSecondaryCtaProps {
  label: string;
  onClick: () => void;
}

export interface WizardShellProps {
  currentStep: WizardStep;
  title: string;
  description: string;
  onBack?: (() => void) | undefined;
  children: ReactNode;
  primary?: WizardShellCtaProps | undefined;
  secondary?: WizardShellSecondaryCtaProps | undefined;
  totalSteps?: number | undefined;
  // Esconde a barra de progresso. Use em telas de bifurcação (escolha de tipo),
  // que não são uma etapa numerada do fluxo.
  hideSteps?: boolean | undefined;
}

export function WizardShell({
  currentStep,
  title,
  description,
  onBack,
  children,
  primary,
  secondary,
  totalSteps = 4,
  hideSteps = false,
}: WizardShellProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new step's heading so screen-reader/keyboard users land on
  // the fresh content instead of the now-replaced button.
  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  useEffect(() => {
    setFocusMode(true);
    return () => setFocusMode(false);
  }, []);

  const isPicker = !primary && !secondary;

  return (
    <main
      className={`relative mx-auto flex w-full max-w-md flex-col px-4 pb-6 pt-7 md:max-w-2xl md:pt-4 lg:max-w-3xl ${
        isPicker ? "min-h-[calc(100dvh-72px)] md:min-h-0" : ""
      }`}
    >
      <div className="relative z-10 flex items-center gap-[10px]">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Voltar"
          className={`flex h-8 items-center justify-center rounded-lg bg-[color:var(--surface-2)] text-[color:var(--text-primary)] backdrop-blur-sm transition-colors hover:bg-[color:var(--surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
            hideSteps ? "gap-1.5 px-2.5" : "w-8"
          }`}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          {hideSteps ? <span className="text-[0.8125rem] font-semibold">Voltar</span> : null}
        </button>
        {hideSteps ? (
          <div className="flex-1" />
        ) : (
          <>
            <div className="flex flex-1 gap-1" aria-hidden>
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => {
                const cls =
                  n < currentStep
                    ? "bg-[color:var(--color-brand-800)]"
                    : n === currentStep
                      ? "bg-[color:var(--color-brand-500)]"
                      : "bg-[color:var(--border-strong)]";
                return (
                  <span
                    key={n}
                    className={`h-1 flex-1 rounded transition-colors duration-300 ${cls}`}
                  />
                );
              })}
            </div>
            <span
              role="status"
              aria-live="polite"
              className="text-[0.6875rem] font-semibold text-[color:var(--text-primary)] opacity-60"
              aria-label={`Etapa ${currentStep} de ${totalSteps}`}
            >
              {currentStep}/{totalSteps}
            </span>
          </>
        )}
      </div>

      <div
        key={currentStep}
        className={`relative z-10 mt-5 animate-in fade-in-0 duration-150 md:mt-10 ${
          isPicker ? "my-auto md:my-0" : ""
        }`}
      >
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[1.375rem] font-bold leading-[1.2] tracking-[-0.3px] text-[color:var(--text-primary)] outline-none"
        >
          {title}
        </h1>
        <p className="mb-3 mt-1.5 text-[0.8125rem] leading-[1.45] text-[color:var(--text-primary)] opacity-75">
          {description}
        </p>
        <div className="flex flex-col gap-2 md:gap-3.5">{children}</div>
      </div>

      {primary || secondary ? (
        <div className="sticky bottom-3 z-20 mt-5 flex gap-2 md:static md:mt-6">
          {secondary ? (
            <button
              type="button"
              onClick={secondary.onClick}
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-[14px] text-[0.875rem] font-bold text-[color:var(--text-primary)] backdrop-blur transition-colors hover:bg-[color:var(--surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
            >
              {secondary.label}
            </button>
          ) : null}
          {primary ? (
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled || primary.loading}
              aria-busy={primary.loading || undefined}
              className="relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-[14px] text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: "linear-gradient(135deg, #f28e25, #ef7a1a)",
              }}
            >
              <span
                className={`flex items-center gap-1.5 transition-opacity ${primary.loading ? "opacity-0" : "opacity-100"}`}
              >
                {primary.label}
                {primary.icon}
              </span>
              {primary.loading ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={18} decorative />
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
