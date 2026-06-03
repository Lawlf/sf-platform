import { Check, Inbox, X } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";

import { listPendingActions } from "@/application/use-cases/mcp/list-pending-actions.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleMcpConnectionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-connection.repository";
import { DrizzleMcpPendingActionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-pending-action.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";
import { approvePendingAction, rejectPendingAction } from "../_actions";
import { formatDate, previewSummary, toolLabel } from "../_labels";

export const metadata: Metadata = { title: "Ações pendentes" };

export default async function PendentesPage() {
  const user = await requireUser();
  const connections = await new DrizzleMcpConnectionRepository().listForUser(user.id);
  const nameById = new Map(connections.map((c) => [c.id, c.clientName]));
  const pending = await listPendingActions(
    { pending: new DrizzleMcpPendingActionRepository(), clock: new SystemClock() },
    { userId: user.id },
  );

  return (
    <PageShell
      title="Ações pendentes"
      description="Operações de alto valor ou destrutivas que um assistente pediu e aguardam você."
      backHref={"/app/configuracoes/integracoes" as Route}
    >
      {pending.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Inbox size={20} strokeWidth={1.75} aria-hidden />
          </span>
          <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            Nada aguardando
          </p>
          <p className="max-w-sm text-[0.8125rem] text-[color:var(--text-secondary)]">
            Quando um assistente pedir uma exclusão ou uma operação acima de R$ 5.000, ela aparece
            aqui para sua aprovação.
          </p>
        </div>
      ) : (
        pending.map((p) => {
          const summary = previewSummary(p.args);
          const clientName = nameById.get(p.connectionId);
          return (
            <article
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.06] p-4 backdrop-blur-xl"
            >
              <div className="min-w-0">
                <div className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
                  {toolLabel(p.toolName)}
                </div>
                {summary ? (
                  <div className="mt-0.5 truncate text-[0.8125rem] text-[color:var(--text-secondary)]">
                    {summary}
                  </div>
                ) : null}
                <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-muted)]">
                  {clientName ? `Pedido por ${clientName} · ` : ""}
                  expira em {formatDate(p.expiresAt)}
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
        })
      )}
    </PageShell>
  );
}
