import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import {
  MCP_SCOPE_DESCRIPTIONS,
  MCP_SHIPPED_SCOPES,
  type McpScope,
  parseScopeString,
} from "@/domain/mcp/scopes";
import { DrizzleMcpOauthClientRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-oauth-client.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";

import { approveAuthorization } from "./_actions";

export const metadata: Metadata = { title: "Conectar assistente" };

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export default async function AutorizarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const sp = await searchParams;
  const clientId = sp.client_id ?? "";
  const client = clientId
    ? await new DrizzleMcpOauthClientRepository().findByClientId(clientId)
    : null;
  const shipped = new Set<McpScope>(MCP_SHIPPED_SCOPES);
  const scopes = parseScopeString(sp.scope).filter((scope) => shipped.has(scope));
  const invalid =
    !client ||
    !sp.redirect_uri ||
    !client.redirectUris.includes(sp.redirect_uri) ||
    sp.code_challenge_method !== "S256" ||
    !sp.code_challenge ||
    scopes.length === 0;

  if (invalid) {
    return (
      <PageShell
        title="Autorização inválida"
        description="A solicitação de conexão não pôde ser validada."
      >
        <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
          Volte ao seu assistente de IA e inicie a conexão novamente.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Conectar assistente"
      description={`${client.name} quer acessar sua conta no Sabor Financeiro.`}
    >
      <form action={approveAuthorization} className="flex flex-col gap-4">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={sp.redirect_uri} />
        <input type="hidden" name="state" value={sp.state ?? ""} />
        <input type="hidden" name="code_challenge" value={sp.code_challenge} />

        <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            <ShieldCheck
              size={16}
              strokeWidth={1.75}
              className="text-[color:var(--color-brand-800)]"
              aria-hidden
            />
            Permissões solicitadas
          </div>
          <ul className="flex flex-col gap-2.5">
            {scopes.map((scope) => (
              <li
                key={scope}
                className="flex items-start gap-2.5 text-[0.8125rem] text-[color:var(--text-secondary)]"
              >
                <input
                  type="checkbox"
                  id={`scope-${scope}`}
                  name="scope"
                  value={scope}
                  defaultChecked
                  className="focus-ring mt-0.5 h-4 w-4 flex-none accent-[color:var(--color-brand-500)]"
                />
                <label htmlFor={`scope-${scope}`}>{MCP_SCOPE_DESCRIPTIONS[scope]}</label>
              </li>
            ))}
          </ul>
        </section>

        <p className="px-1 text-[0.75rem] text-[color:var(--text-muted)]">
          Você pode revogar o acesso ou ajustar permissões a qualquer momento em Integrações.
        </p>

        <button
          type="submit"
          className="focus-ring rounded-2xl bg-[color:var(--color-brand-500)] px-4 py-3 text-[0.875rem] font-bold text-white transition-colors hover:bg-[color:var(--color-brand-600)]"
        >
          Autorizar conexão
        </button>
      </form>
    </PageShell>
  );
}
