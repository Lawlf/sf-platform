import { History, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";

import { listMcpAudit } from "@/application/use-cases/mcp/list-mcp-audit.use-case";
import { DrizzleMcpAuditLogRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-audit-log.repository";
import { DrizzleMcpConnectionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-connection.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";
import { undoAuditAction } from "../_actions";
import { entityLabel, formatDate, toolLabel } from "../_labels";

export const metadata: Metadata = { title: "Atividade" };

export default async function AtividadePage() {
  const user = await requireUser();
  const connections = await new DrizzleMcpConnectionRepository().listForUser(user.id);
  const nameById = new Map(connections.map((c) => [c.id, c.clientName]));
  const audit = await listMcpAudit(
    { audit: new DrizzleMcpAuditLogRepository() },
    { userId: user.id, limit: 50 },
  );

  return (
    <PageShell
      title="Atividade"
      description="O que os assistentes de IA fizeram na sua conta."
      backHref={"/app/configuracoes/integracoes" as Route}
    >
      {audit.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <History size={20} strokeWidth={1.75} aria-hidden />
          </span>
          <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Nenhuma alteração ainda
          </p>
          <p className="max-w-sm text-[0.8125rem] text-[color:var(--text-secondary)]">
            Assim que um assistente criar, editar ou excluir algo, fica registrado aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {audit.map((entry) => {
            const clientName = nameById.get(entry.connectionId);
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
                    {clientName ? ` · ${clientName}` : ""} · {formatDate(entry.createdAt)}
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
    </PageShell>
  );
}
