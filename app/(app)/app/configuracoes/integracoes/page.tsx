import { BookOpen, Check, History, Plug, Trash2, Undo2, X } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { listMcpAudit } from "@/application/use-cases/mcp/list-mcp-audit.use-case";
import { listPendingActions } from "@/application/use-cases/mcp/list-pending-actions.use-case";
import { MCP_SCOPE_DESCRIPTIONS, MCP_SHIPPED_SCOPES } from "@/domain/mcp/scopes";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleMcpAuditLogRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-audit-log.repository";
import { DrizzleMcpConnectionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-connection.repository";
import { DrizzleMcpPendingActionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-pending-action.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import {
  approvePendingAction,
  rejectPendingAction,
  revokeConnectionAction,
  toggleScopeAction,
  undoAuditAction,
} from "./_actions";

export const metadata: Metadata = { title: "Integrações" };

const TOOL_LABELS: Record<string, string> = {
  income_create: "Registrar renda",
  income_update: "Atualizar renda",
  income_delete: "Excluir renda",
  debt_create: "Registrar dívida",
  debt_update: "Atualizar dívida",
  debt_delete: "Excluir dívida",
  asset_create: "Registrar patrimônio",
  asset_update: "Atualizar patrimônio",
  asset_delete: "Excluir patrimônio",
  goal_create: "Criar meta",
  goal_update: "Atualizar meta",
  goal_delete: "Excluir meta",
};

const ENTITY_LABELS: Record<string, string> = {
  income: "Renda",
  debt: "Dívida",
  asset: "Patrimônio",
  goal: "Meta",
};

function toolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName;
}

function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

function previewSummary(args: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const label = args.label ?? args.title ?? args.description;
  if (typeof label === "string" && label.trim()) parts.push(label.trim());
  const cents = args.amountCents ?? args.targetCents ?? args.currentValueCents;
  if (typeof cents === "number" && Number.isFinite(cents)) {
    parts.push(
      (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function IntegracoesPage() {
  const user = await requireUser();
  const repo = new DrizzleMcpConnectionRepository();
  const connections = (await repo.listForUser(user.id)).filter((c) => c.status === "active");
  const scopesByConnection = new Map<string, Set<string>>();
  for (const c of connections) {
    scopesByConnection.set(c.id, new Set(await repo.listScopes(c.id)));
  }
  const connectionNameById = new Map(connections.map((c) => [c.id, c.clientName]));

  const pending = await listPendingActions(
    { pending: new DrizzleMcpPendingActionRepository(), clock: new SystemClock() },
    { userId: user.id },
  );
  const audit = await listMcpAudit(
    { audit: new DrizzleMcpAuditLogRepository() },
    { userId: user.id, limit: 50 },
  );

  return (
    <PageShell
      title="Integrações"
      description="Conecte assistentes de IA via MCP e controle o que cada um pode acessar."
      backHref={"/app/configuracoes" as Route}
    >
      <Link
        href={"/app/configuracoes/integracoes/guia" as Route}
        className="focus-ring flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.06] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <BookOpen size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              Como conectar
            </span>
            <span className="block text-[0.8125rem] text-[color:var(--text-secondary)]">
              URL do conector, passo a passo por cliente, escopos e segurança.
            </span>
          </span>
        </span>
      </Link>

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.8125rem] font-bold tracking-wide text-[color:var(--text-secondary)] uppercase">
            Ações pendentes
          </h2>
          {pending.map((p) => {
            const summary = previewSummary(p.args);
            const clientName = connectionNameById.get(p.connectionId);
            return (
              <article
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.06] p-4 backdrop-blur-xl"
              >
                <div className="min-w-0">
                  <div className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
                    {toolLabel(p.toolName)}
                  </div>
                  {summary && (
                    <div className="mt-0.5 truncate text-[0.8125rem] text-[color:var(--text-secondary)]">
                      {summary}
                    </div>
                  )}
                  <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-muted)]">
                    {clientName ? `Pedido por ${clientName} · ` : ""}
                    Expira em {p.expiresAt.toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[color:var(--color-brand-500)]/20 pt-3">
                  <form action={approvePendingAction} className="flex-1">
                    <input type="hidden" name="pending_id" value={p.id} />
                    <button
                      type="submit"
                      className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] px-3 py-2 text-[0.8125rem] font-bold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.22]"
                    >
                      <Check size={15} strokeWidth={2} aria-hidden />
                      Aprovar
                    </button>
                  </form>
                  <form action={rejectPendingAction} className="flex-1">
                    <input type="hidden" name="pending_id" value={p.id} />
                    <button
                      type="submit"
                      className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-[0.8125rem] font-bold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
                    >
                      <X size={15} strokeWidth={2} aria-hidden />
                      Recusar
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {connections.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Plug size={20} strokeWidth={1.75} aria-hidden />
          </span>
          <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Nenhum assistente conectado
          </p>
          <p className="max-w-sm text-[0.8125rem] text-[color:var(--text-secondary)]">
            Conecte o Claude, ChatGPT, OpenClaw ou qualquer cliente compatível ao conector MCP do
            Sabor Financeiro. Depois de autorizar, ele aparece aqui para você gerenciar.
          </p>
          <Link
            href={"/app/configuracoes/integracoes/guia" as Route}
            className="focus-ring mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.22]"
          >
            <BookOpen size={15} strokeWidth={2} aria-hidden />
            Como conectar
          </Link>
        </section>
      ) : (
        connections.map((c) => {
          const granted = scopesByConnection.get(c.id) ?? new Set<string>();
          return (
            <section
              key={c.id}
              className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
                    {c.clientName}
                  </div>
                  <div className="text-[0.75rem] text-[color:var(--text-muted)]">
                    Conectado em {c.createdAt.toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <form action={revokeConnectionAction}>
                  <input type="hidden" name="connection_id" value={c.id} />
                  <button
                    type="submit"
                    className="focus-ring flex flex-none items-center gap-1 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.08] px-3 py-2 text-[0.75rem] font-bold text-[color:var(--semantic-negative)] transition-colors hover:bg-[color:var(--semantic-negative)]/[0.14]"
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                    Revogar
                  </button>
                </form>
              </div>
              <ul className="flex flex-col gap-1.5 border-t border-[color:var(--border-soft)] pt-3">
                {MCP_SHIPPED_SCOPES.map((scope) => {
                  const isOn = granted.has(scope);
                  return (
                    <li
                      key={scope}
                      className="flex items-center justify-between gap-3 text-[0.8125rem]"
                    >
                      <span className="text-[color:var(--text-secondary)]">
                        {MCP_SCOPE_DESCRIPTIONS[scope]}
                      </span>
                      <form action={toggleScopeAction} className="flex-none">
                        <input type="hidden" name="connection_id" value={c.id} />
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
        })
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 text-[0.8125rem] font-bold tracking-wide text-[color:var(--text-secondary)] uppercase">
          <History size={14} strokeWidth={1.75} aria-hidden />
          Atividade recente
        </h2>
        {audit.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-[0.8125rem] text-[color:var(--text-secondary)] backdrop-blur-xl">
            Nenhuma alteração feita por assistentes de IA até agora.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {audit.map((entry) => {
              const clientName = connectionNameById.get(entry.connectionId);
              const canUndo = entry.reversible && entry.undoneAt === null;
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3.5 backdrop-blur-xl"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                      {toolLabel(entry.toolName)}
                    </div>
                    <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-muted)]">
                      {entityLabel(entry.entityType)}
                      {clientName ? ` · ${clientName}` : ""} ·{" "}
                      {entry.createdAt.toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  {canUndo ? (
                    <form action={undoAuditAction} className="flex-none">
                      <input type="hidden" name="audit_id" value={entry.id} />
                      <button
                        type="submit"
                        className="focus-ring flex items-center gap-1 rounded-xl border border-[color:var(--border-soft)] px-3 py-2 text-[0.75rem] font-bold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
                      >
                        <Undo2 size={14} strokeWidth={1.75} aria-hidden />
                        Desfazer
                      </button>
                    </form>
                  ) : entry.undoneAt !== null ? (
                    <span className="flex-none rounded-xl bg-[color:var(--surface-2)] px-3 py-2 text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
                      Desfeito
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
