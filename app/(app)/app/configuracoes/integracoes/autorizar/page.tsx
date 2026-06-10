import { Eye, type LucideIcon, Pencil, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";

import {
  MCP_SCOPE_DESCRIPTIONS,
  MCP_SHIPPED_SCOPES,
  type McpScope,
  parseScopeString,
} from "@/domain/mcp/scopes";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";

import { approveAuthorization } from "./_actions";
import { AuthorizeSubmit } from "./submit-button.client";

export const metadata: Metadata = { title: "Conectar assistente" };

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

function ScopeGroup({
  title,
  caption,
  icon: Icon,
  scopes,
  defaultChecked,
  danger,
}: {
  title: string;
  caption?: string;
  icon: LucideIcon;
  scopes: McpScope[];
  defaultChecked: boolean;
  danger?: boolean;
}) {
  if (scopes.length === 0) return null;
  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur-xl ${
        danger
          ? "border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.05]"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
      }`}
    >
      <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
        <Icon
          size={16}
          strokeWidth={1.75}
          className={
            danger
              ? "text-[color:var(--semantic-negative)]"
              : "text-[color:var(--color-brand-800)]"
          }
          aria-hidden
        />
        {title}
      </div>
      {caption ? <p className="text-[0.75rem] text-[color:var(--text-muted)]">{caption}</p> : null}
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
              defaultChecked={defaultChecked}
              className="focus-ring mt-0.5 h-4 w-4 flex-none accent-[color:var(--color-brand-500)]"
            />
            <label htmlFor={`scope-${scope}`}>{MCP_SCOPE_DESCRIPTIONS[scope]}</label>
          </li>
        ))}
      </ul>
    </section>
  );
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
    ? await repos.mcpOauthClients.findByClientId(clientId)
    : null;
  const shipped = new Set<McpScope>(MCP_SHIPPED_SCOPES);
  const scopes = parseScopeString(sp.scope).filter((scope) => shipped.has(scope));
  const readScopes = scopes.filter((s) => s.endsWith(":read"));
  const writeScopes = scopes.filter((s) => s.endsWith(":write"));
  const deleteScopes = scopes.filter((s) => s.endsWith(":delete"));
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

        <ScopeGroup title="Ver seus dados" icon={Eye} scopes={readScopes} defaultChecked />
        <ScopeGroup title="Criar e editar" icon={Pencil} scopes={writeScopes} defaultChecked />
        <ScopeGroup
          title="Excluir"
          icon={TriangleAlert}
          scopes={deleteScopes}
          defaultChecked={false}
          danger
          caption="Deixa o assistente apagar dados. Marque só se tiver certeza; você pode conceder depois em Integrações."
        />

        <p className="px-1 text-[0.75rem] text-[color:var(--text-muted)]">
          Você pode revogar o acesso ou ajustar permissões a qualquer momento em Integrações.
        </p>

        <AuthorizeSubmit />
      </form>
    </PageShell>
  );
}
