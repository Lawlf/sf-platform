import type { Metadata } from "next";
import type { Route } from "next";

import { DrizzleOauthAccountRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-oauth-account.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

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
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <h2 className="text-[16px] font-bold text-[color:var(--text-primary)]">Identidade</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Nome
            </span>
            <AccountNameForm initialDisplayName={user.displayName ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] pt-4">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
              Email
            </span>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[15px] font-semibold text-[color:var(--text-primary)]">
                {user.email}
              </span>
              {user.emailVerifiedAt ? (
                <span className="inline-flex items-center rounded-full bg-[color:var(--semantic-positive)]/15 px-2.5 py-1 text-[11px] font-bold text-[color:var(--semantic-positive)]">
                  Verificado
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[color:var(--surface-2)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--text-secondary)]">
                  Pendente
                </span>
              )}
            </div>
            <p className="text-[12px] text-[color:var(--text-secondary)]">
              Email não pode ser alterado por aqui. Fale com o suporte se precisar mudar.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <h2 className="text-[16px] font-bold text-[color:var(--text-primary)]">Login social</h2>
        <p className="mt-1 text-[12px] text-[color:var(--text-secondary)]">
          Entre com sua conta Google sem precisar de link mágico no email.
        </p>
        <div className="mt-4">
          <GoogleLinkRow linked={googleLinked} />
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <h2 className="text-[16px] font-bold text-[color:var(--text-primary)]">Desativar conta</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
          Sua conta será desativada imediatamente. Os dados ficam retidos conforme nossa política de
          privacidade (LGPD). Você não poderá entrar novamente; fale com o suporte para reativar.
        </p>
        <div className="mt-4">
          <DeactivateForm />
        </div>
      </section>
    </PageShell>
  );
}
