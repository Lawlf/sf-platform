import { Eye, type LucideIcon, Pencil, Trash2, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { MCP_SCOPE_DESCRIPTIONS, MCP_SHIPPED_SCOPES, type McpScope } from "@/domain/mcp/scopes";
import { DrizzleMcpConnectionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-connection.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";
import { revokeConnectionAction, toggleScopeAction } from "../_actions";
import { formatDate } from "../_labels";

export const metadata: Metadata = { title: "Conexão" };

const READ = MCP_SHIPPED_SCOPES.filter((s) => s.endsWith(":read"));
const WRITE = MCP_SHIPPED_SCOPES.filter((s) => s.endsWith(":write"));
const DELETE = MCP_SHIPPED_SCOPES.filter((s) => s.endsWith(":delete"));

function ScopeGroup({
  title,
  icon: Icon,
  scopes,
  granted,
  connectionId,
  danger,
}: {
  title: string;
  icon: LucideIcon;
  scopes: McpScope[];
  granted: Set<string>;
  connectionId: string;
  danger?: boolean;
}) {
  if (scopes.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
        <Icon
          size={15}
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
      <ul className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] pt-3">
        {scopes.map((scope) => {
          const isOn = granted.has(scope);
          return (
            <li key={scope} className="flex items-center justify-between gap-3 text-[0.8125rem]">
              <span className="text-[color:var(--text-secondary)]">
                {MCP_SCOPE_DESCRIPTIONS[scope]}
              </span>
              <form action={toggleScopeAction} className="flex-none">
                <input type="hidden" name="connection_id" value={connectionId} />
                <input type="hidden" name="scope" value={scope} />
                <input type="hidden" name="grant" value={(!isOn).toString()} />
                <button
                  type="submit"
                  aria-label={
                    isOn
                      ? `Remover permissão: ${MCP_SCOPE_DESCRIPTIONS[scope]}`
                      : `Conceder permissão: ${MCP_SCOPE_DESCRIPTIONS[scope]}`
                  }
                  className={`focus-ring rounded-lg border px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors ${
                    isOn
                      ? "border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
                      : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                  }`}
                >
                  {isOn ? "Remover" : "Conceder"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const user = await requireUser();
  const { connectionId } = await params;
  const repo = new DrizzleMcpConnectionRepository();
  const connection = await repo.findById(connectionId);
  if (!connection || connection.userId !== user.id || connection.status !== "active") {
    notFound();
  }
  const granted = new Set(await repo.listScopes(connectionId));

  return (
    <PageShell
      title={connection.clientName}
      description={`Conectado em ${formatDate(connection.createdAt)} · último uso em ${formatDate(connection.lastUsedAt)}.`}
      backHref={"/app/configuracoes/integracoes" as Route}
    >
      <p className="px-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
        Escolha o que este assistente pode fazer. As mudanças valem na próxima chamada.
      </p>

      <ScopeGroup
        title="Ver seus dados"
        icon={Eye}
        scopes={READ}
        granted={granted}
        connectionId={connectionId}
      />
      <ScopeGroup
        title="Criar e editar"
        icon={Pencil}
        scopes={WRITE}
        granted={granted}
        connectionId={connectionId}
      />
      <ScopeGroup
        title="Excluir"
        icon={TriangleAlert}
        scopes={DELETE}
        granted={granted}
        connectionId={connectionId}
        danger
      />

      <form action={revokeConnectionAction} className="mt-2">
        <input type="hidden" name="connection_id" value={connectionId} />
        <button
          type="submit"
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.08] px-4 py-3 text-[0.875rem] font-bold text-[color:var(--semantic-negative)] transition-colors hover:bg-[color:var(--semantic-negative)]/[0.14]"
        >
          <Trash2 size={16} strokeWidth={1.75} aria-hidden />
          Revogar acesso deste assistente
        </button>
      </form>
    </PageShell>
  );
}
