"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

const emailSchema = z.object({
  email: z.string().email("Email invalido.").max(320),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Codigo deve ter 6 digitos."),
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
        setServerError(body?.message ?? "Nao foi possivel enviar o email.");
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
        setServerError(body?.message ?? "Nao foi possivel validar o codigo.");
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            {...emailForm.register("email")}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
          />
          {emailForm.formState.errors.email ? (
            <span role="alert" className="text-xs text-[color:var(--color-negative)]">
              {emailForm.formState.errors.email.message}
            </span>
          ) : null}
        </label>
        {serverError ? (
          <div role="alert" className="text-sm text-[color:var(--color-negative)]">
            {serverError}
          </div>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Receber codigo"}
        </Button>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={codeForm.handleSubmit(onSubmitCode)} className="flex flex-col gap-4">
      <p className="text-sm opacity-80">
        Enviamos um codigo para <strong>{email}</strong>. Cole abaixo ou clique no link do email.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Codigo</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          {...codeForm.register("code")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
        {codeForm.formState.errors.code ? (
          <span role="alert" className="text-xs text-[color:var(--color-negative)]">
            {codeForm.formState.errors.code.message}
          </span>
        ) : null}
      </label>
      {serverError ? (
        <div role="alert" className="text-sm text-[color:var(--color-negative)]">
          {serverError}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Validando..." : "Entrar"}
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
