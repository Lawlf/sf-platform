import type { Metadata } from "next";
import type { Route } from "next";

import { DrizzleOauthAccountRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-oauth-account.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { PrefSection } from "../acessibilidade/_components/pref-section";

import { AccountNameForm } from "./_components/account-name-form";
import { DeactivateForm } from "./_components/deactivate-form";
import { GoogleLinkRow } from "./_components/google-link-row";

export const metadata: Metadata = { title: "Conta" };

export default async function ContaPage() {
  const user = await requireUser();
  const oauthAccounts = await new DrizzleOauthAccountRepository().listForUser(user.id);
  const googleLinked = oauthAccounts.some((a) => a.provider === "google");

  return (
    <PageShell
      title="Dados pessoais"
      description="Sua conta na plataforma."
      backHref={"/app/configuracoes" as Route}
    >
      <div className="divide-y divide-[color:var(--border-soft)]">
        <PrefSection eyebrow="Você" title="Identidade" description="Seu nome e email de acesso.">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Nome
            </span>
            <AccountNameForm initialDisplayName={user.displayName ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] pt-4">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Email
            </span>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                {user.email}
              </span>
              {user.emailVerifiedAt ? (
                <span className="inline-flex items-center rounded-full bg-[color:var(--semantic-positive)]/15 px-2.5 py-1 text-[0.6875rem] font-bold text-[color:var(--semantic-positive)]">
                  Verificado
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[color:var(--surface-2)] px-2.5 py-1 text-[0.6875rem] font-bold text-[color:var(--text-secondary)]">
                  Pendente
                </span>
              )}
            </div>
            <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
              Email não pode ser alterado por aqui. Fale com o suporte se precisar mudar.
            </p>
          </div>
        </div>
        </PrefSection>

        <PrefSection
          eyebrow="Acesso"
          title="Login social"
          description="Entre com sua conta Google sem precisar de link mágico no email."
        >
          <GoogleLinkRow linked={googleLinked} />
        </PrefSection>

        <PrefSection
          eyebrow="Conta"
          title="Desativar conta"
          description="Sua conta será desativada imediatamente. Os dados ficam retidos conforme nossa política de privacidade (LGPD). Você não poderá entrar novamente; fale com o suporte para reativar."
        >
          <DeactivateForm />
        </PrefSection>
      </div>
    </PageShell>
  );
}
