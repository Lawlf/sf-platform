"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";

import { BrandBlock } from "./brand-block";
import { OAuthButtons } from "./oauth-buttons";

const emailSchema = z.object({
  email: z.string().email("Email inválido.").max(320),
});

type EmailValues = z.infer<typeof emailSchema>;
type Step = "email" | "code";

const RESEND_COOLDOWN_SECONDS = 30;

interface LoginPanelProps {
  errorMessage: string | null;
}

export function LoginPanel({ errorMessage }: LoginPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  async function onSubmitEmail(values: EmailValues) {
    setServerError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!res.ok) {
        setServerError(body?.message ?? "Não foi possível enviar o email.");
        return;
      }
      setEmail(values.email);
      setCode("");
      setStep("code");
    } finally {
      setPending(false);
    }
  }

  const verifyCode = useCallback(
    async (value: string) => {
      setVerifying(true);
      setServerError(null);
      try {
        const res = await fetch("/api/auth/magic-link/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: value }),
        });
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
        } | null;
        if (!res.ok) {
          setServerError(body?.message ?? "Código inválido. Verifique e tente novamente.");
          codeInputRef.current?.focus();
          codeInputRef.current?.select();
          return;
        }
        router.push("/app" as Route);
        router.refresh();
      } finally {
        setVerifying(false);
      }
    },
    [email, router],
  );

  // Auto-validate as soon as 6 digits are present (no submit button).
  // serverError gate prevents an immediate retry loop after a failed attempt;
  // it clears on the next keystroke, re-arming validation.
  useEffect(() => {
    if (step !== "code" || verifying || serverError) return;
    if (/^\d{6}$/.test(code)) {
      void verifyCode(code);
    }
  }, [code, step, verifying, serverError, verifyCode]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function onResend() {
    if (resendCooldown > 0 || pending) return;
    setServerError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setServerError(body?.message ?? "Não foi possível reenviar o código.");
        return;
      }
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setPending(false);
    }
  }

  function onBack() {
    if (step === "code") {
      setStep("email");
      setServerError(null);
      setCode("");
      return;
    }
    router.push("/" as Route);
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="focus-ring absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--color-brand-800)] transition hover:bg-[color:var(--color-brand-50)]"
        aria-label={step === "code" ? "Voltar para a etapa de email" : "Voltar para a página inicial"}
      >
        <span aria-hidden>←</span>
        Voltar
      </button>

      <section className="relative z-10 w-full max-w-md">
        <BrandBlock />
        <div className="glass-tier-2 !rounded-[22px] p-6">
          {errorMessage ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-4 py-3 text-sm text-[color:var(--semantic-negative)]"
            >
              {errorMessage}
            </div>
          ) : null}

          {step === "email" ? (
            <form
              noValidate
              onSubmit={emailForm.handleSubmit(onSubmitEmail)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-email"
                  className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
                >
                  Seu email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-brand-800)]"
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="seu@email.com"
                    aria-invalid={emailForm.formState.errors.email ? true : undefined}
                    aria-describedby={
                      emailForm.formState.errors.email ? "login-email-error" : undefined
                    }
                    {...emailForm.register("email")}
                    className="w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] py-[13px] pl-[42px] pr-[14px] text-[15px] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
                  />
                </div>
                {emailForm.formState.errors.email ? (
                  <span
                    id="login-email-error"
                    role="alert"
                    className="text-xs text-[color:var(--semantic-negative)]"
                  >
                    {emailForm.formState.errors.email.message}
                  </span>
                ) : (
                  <span className="text-xs text-[color:var(--text-muted)]">
                    A gente manda um código pro seu email. Sem senha pra decorar.
                  </span>
                )}
              </div>
              {serverError ? (
                <div role="alert" className="text-sm text-[color:var(--semantic-negative)]">
                  {serverError}
                </div>
              ) : null}
              <Button
                type="submit"
                variant="brand"
                loading={pending}
                className="!h-auto !rounded-xl py-[14px] text-[15px] font-bold"
              >
                Receber código por email
              </Button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!verifying && /^\d{6}$/.test(code)) void verifyCode(code);
              }}
            >
              <p className="text-sm text-[color:var(--text-secondary)]">
                Enviamos um código para{" "}
                <strong className="text-[color:var(--text-primary)]">{email}</strong>. Cole abaixo ou
                clique no link do email. Verificamos automaticamente ao completar os 6 dígitos.
              </p>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-code"
                  className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
                >
                  Código
                </label>
                <input
                  id="login-code"
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  value={code}
                  disabled={verifying}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setServerError(null);
                  }}
                  aria-invalid={serverError ? true : undefined}
                  aria-describedby={serverError ? "login-code-error" : undefined}
                  className={`rounded-xl border bg-[color:var(--surface-1)] px-3 py-3 text-center text-2xl tracking-[0.5em] text-[color:var(--text-primary)] outline-none transition-colors focus:ring-2 disabled:opacity-70 ${
                    serverError
                      ? "border-[color:var(--semantic-negative)] focus:border-[color:var(--semantic-negative)] focus:ring-[color:var(--semantic-negative)]/30"
                      : "border-[color:var(--border-soft)] focus:border-[color:var(--color-brand-500)] focus:ring-[color:var(--color-brand-500)]/30"
                  }`}
                />
              </div>

              {/* status replaces the old "Entrar" button; only takes space once active */}
              {verifying ? (
                <div
                  className="flex items-center justify-center gap-2 text-sm text-[color:var(--color-brand-500)]"
                  role="status"
                  aria-live="polite"
                >
                  <Spinner size={15} decorative />
                  <span className="sr-only">Entrando</span>
                </div>
              ) : serverError ? (
                <div
                  id="login-code-error"
                  role="alert"
                  className="flex items-center justify-center gap-2 text-sm text-[color:var(--semantic-negative)]"
                >
                  {serverError}
                </div>
              ) : null}

              <div className="text-center">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendCooldown > 0 || pending}
                  className="focus-ring rounded-lg px-2 py-1 text-[13px] font-semibold text-[color:var(--color-brand-500)] transition-colors hover:bg-[color:var(--color-brand-50)] disabled:cursor-default disabled:text-[color:var(--text-muted)] disabled:hover:bg-transparent"
                >
                  {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
                </button>
              </div>
            </form>
          )}

          {step === "email" ? (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[color:var(--border-soft)]" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
                  ou continue com
                </span>
                <span className="h-px flex-1 bg-[color:var(--border-soft)]" />
              </div>
              <OAuthButtons />
            </>
          ) : null}

          <p className="mt-5 text-center text-[11px] text-[color:var(--text-muted)]">
            Ao continuar você concorda com os{" "}
            <a href="/termos" className="font-semibold text-[color:var(--color-brand-800)] underline">
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a href="/privacidade" className="font-semibold text-[color:var(--color-brand-800)] underline">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
