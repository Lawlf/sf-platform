import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { BrandBlock } from "./_components/brand-block";
import { MagicLinkForm } from "./_components/magic-link-form";
import { OAuthButtons } from "./_components/oauth-buttons";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre no Sabor Financeiro por magic link ou Google.",
  alternates: { canonical: "/entrar" },
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  link_invalido: "Link inválido ou expirado.",
  magic_link_invalid: "Link inválido ou expirado.",
  magic_link_already_used: "Este link já foi utilizado.",
  magic_link_expired: "Link expirado. Solicite um novo.",
  account_deactivated: "Conta desativada. Fale com o suporte para reativar.",
  account_deactivated_self: "Conta desativada com sucesso.",
};

export default async function EntrarPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app" as Route);
  }

  const sp = await searchParams;
  const errorCode = sp.error;
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Não foi possível entrar.") : null;

  return (
    <main className="bg-warm-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="bg-blob-top-right" aria-hidden />
      <div className="bg-blob-bottom-left" aria-hidden />
      <Link
        href={"/" as Route}
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--color-brand-800)] transition hover:bg-[color:var(--color-brand-50)]"
        aria-label="Voltar para a página inicial"
      >
        <span aria-hidden>←</span>
        Voltar
      </Link>
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
          <MagicLinkForm />
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[color:var(--border-soft)]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
              ou continue com
            </span>
            <span className="h-px flex-1 bg-[color:var(--border-soft)]" />
          </div>
          <OAuthButtons />
          <p className="mt-5 text-center text-[11px] text-[color:var(--text-muted)]">
            Ao continuar você concorda com os{" "}
            <a
              href="/termos"
              className="font-semibold text-[color:var(--color-brand-800)] underline"
            >
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a
              href="/privacidade"
              className="font-semibold text-[color:var(--color-brand-800)] underline"
            >
              Política de Privacidade
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
