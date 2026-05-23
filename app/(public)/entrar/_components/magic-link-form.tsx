"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

const emailSchema = z.object({
  email: z.string().email("Email inválido.").max(320),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos."),
});

type EmailValues = z.infer<typeof emailSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type Step = "email" | "code";

export function MagicLinkForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
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
      setStep("code");
    } finally {
      setPending(false);
    }
  }

  async function onSubmitCode(values: CodeValues) {
    setServerError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/magic-link/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: values.code }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!res.ok) {
        setServerError(body?.message ?? "Não foi possível validar o código.");
        return;
      }
      router.push("/app");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (step === "email") {
    return (
      <form
        noValidate
        onSubmit={emailForm.handleSubmit(onSubmitEmail)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
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
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="seu@email.com"
              {...emailForm.register("email")}
              className="w-full rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] py-[13px] pl-[42px] pr-[14px] text-[15px] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
            />
          </div>
          {emailForm.formState.errors.email ? (
            <span role="alert" className="text-xs text-[color:var(--semantic-negative)]">
              {emailForm.formState.errors.email.message}
            </span>
          ) : null}
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
          Avançar
        </Button>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={codeForm.handleSubmit(onSubmitCode)} className="flex flex-col gap-4">
      <p className="text-sm text-[color:var(--text-secondary)]">
        Enviamos um código para{" "}
        <strong className="text-[color:var(--text-primary)]">{email}</strong>. Cole abaixo ou clique
        no link do email.
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
          Código
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          {...codeForm.register("code")}
          className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-3 text-center text-2xl tracking-[0.5em] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
        {codeForm.formState.errors.code ? (
          <span role="alert" className="text-xs text-[color:var(--semantic-negative)]">
            {codeForm.formState.errors.code.message}
          </span>
        ) : null}
      </div>
      {serverError ? (
        <div role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {serverError}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="brand"
          loading={pending}
          className="!h-auto !rounded-xl flex-1 py-[14px] text-[15px] font-bold"
        >
          Entrar
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setStep("email");
            setServerError(null);
            codeForm.reset();
          }}
          disabled={pending}
        >
          Trocar email
        </Button>
      </div>
    </form>
  );
}
