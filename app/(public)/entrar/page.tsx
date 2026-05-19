import type { Metadata } from "next";

import { MagicLinkForm } from "./_components/magic-link-form";
import { OAuthButtons } from "./_components/oauth-buttons";

export const metadata: Metadata = {
  title: "Entrar - Sabor Financeiro",
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  link_invalido: "Link invalido ou expirado.",
  magic_link_invalid: "Link invalido ou expirado.",
  magic_link_already_used: "Este link ja foi utilizado.",
  magic_link_expired: "Link expirado. Solicite um novo.",
  account_deactivated: "Conta desativada. Fale com o suporte para reativar.",
  account_deactivated_self: "Conta desativada com sucesso.",
  oauth_failed: "Nao foi possivel entrar com este provedor. Tente novamente.",
  oauth_state_mismatch: "Sessao de login expirou. Tente novamente.",
  oauth_account_link_requires_verification:
    "Ja existe uma conta com este email. Entre com o magic link para vincular este provedor.",
};

export default async function EntrarPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const errorCode = sp.error;
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Nao foi possivel entrar.") : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="glass-light w-full max-w-md p-8">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-brand-800)]">
            Entrar
          </h1>
          <p className="mt-2 text-sm opacity-80">Use seu email ou um provedor para entrar.</p>
        </header>
        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-[color:var(--color-negative)]/30 bg-[color:var(--color-negative)]/10 px-4 py-3 text-sm text-[color:var(--color-negative)]"
          >
            {errorMessage}
          </div>
        ) : null}
        <div className="mt-6">
          <OAuthButtons />
        </div>
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-black/10" />
          <span className="text-xs uppercase tracking-wide opacity-60">ou</span>
          <span className="h-px flex-1 bg-black/10" />
        </div>
        <MagicLinkForm />
        <p className="mt-6 text-center text-xs opacity-70">
          Ao continuar voce concorda com os{" "}
          <a href="/termos" className="underline">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" className="underline">
            Politica de Privacidade
          </a>
          .
        </p>
      </section>
    </main>
  );
}
