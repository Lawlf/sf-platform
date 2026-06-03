import { BookOpen, ChevronRight, History, Inbox, Plug } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { listPendingActions } from "@/application/use-cases/mcp/list-pending-actions.use-case";
import { MCP_FREE_MONTHLY_LIMIT, mcpUsagePeriod } from "@/domain/mcp/constants";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleMcpConnectionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-connection.repository";
import { DrizzleMcpPendingActionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-pending-action.repository";
import { DrizzleMcpUsageRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-usage.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { formatDate } from "./_labels";

export const metadata: Metadata = { title: "Integrações" };

const CARD =
  "focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]";

export default async function IntegracoesPage() {
  const user = await requireUser();
  const clock = new SystemClock();
  const repo = new DrizzleMcpConnectionRepository();
  const connections = (await repo.listForUser(user.id)).filter((c) => c.status === "active");
  const scopeCountById = new Map<string, number>();
  for (const c of connections) {
    scopeCountById.set(c.id, (await repo.listScopes(c.id)).length);
  }
  const pending = await listPendingActions(
    { pending: new DrizzleMcpPendingActionRepository(), clock },
    { userId: user.id },
  );

  const used = user.isPro
    ? null
    : await new DrizzleMcpUsageRepository().getCount(user.id, mcpUsagePeriod(clock.now()));
  const remaining = used === null ? 0 : Math.max(0, MCP_FREE_MONTHLY_LIMIT - used);
  const usagePct =
    used === null ? 0 : Math.min(100, Math.round((used / MCP_FREE_MONTHLY_LIMIT) * 100));
  const limitReached = used !== null && remaining === 0;

  return (
    <PageShell
      title="Integrações"
      description="Assistentes de IA conectados à sua conta via MCP."
      backHref={"/app/configuracoes" as Route}
    >
      {pending.length > 0 ? (
        <Link
          href={"/app/configuracoes/integracoes/pendentes" as Route}
          className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.07] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--color-brand-500)]/[0.12]"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.16] text-[color:var(--color-brand-800)]">
            <Inbox size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {pending.length} {pending.length === 1 ? "ação aguardando" : "ações aguardando"} aprovação
            </span>
            <span className="block text-[0.8125rem] text-[color:var(--text-secondary)]">
              Revise o que um assistente pediu antes de aplicar.
            </span>
          </span>
          <ChevronRight
            size={18}
            strokeWidth={2}
            className="flex-none text-[color:var(--color-brand-800)]"
            aria-hidden
          />
        </Link>
      ) : null}

      {used === null ? (
        <section className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
            Uso do conector
          </span>
          <span className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)]">
            Plano Pro · sem limite
          </span>
        </section>
      ) : (
        <section className="flex flex-col gap-2.5 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
              Uso do conector este mês
            </span>
            <span className="text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
              {used} / {MCP_FREE_MONTHLY_LIMIT}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]"
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={MCP_FREE_MONTHLY_LIMIT}
            aria-label="Chamadas usadas no mês"
          >
            <div
              className={`h-full rounded-full ${
                limitReached
                  ? "bg-[color:var(--semantic-negative)]"
                  : "bg-[color:var(--color-brand-500)]"
              }`}
              style={{ width: `${Math.max(usagePct, used > 0 ? 4 : 0)}%` }}
            />
          </div>
          {limitReached ? (
            <p className="text-[0.75rem] leading-relaxed text-[color:var(--semantic-negative)]">
              Limite do plano gratuito atingido.{" "}
              <Link
                href={"/app/configuracoes/planos" as Route}
                className="focus-ring rounded font-bold underline"
              >
                Assine o Pro
              </Link>{" "}
              para uso ilimitado. Renova no próximo mês.
            </p>
          ) : (
            <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
              {remaining} {remaining === 1 ? "chamada restante" : "chamadas restantes"} neste mês.
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[0.6875rem] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
          Assistentes conectados
        </h2>
        {connections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
              <Plug size={20} strokeWidth={1.75} aria-hidden />
            </span>
            <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
              Nenhum assistente conectado
            </p>
            <p className="max-w-sm text-[0.8125rem] text-[color:var(--text-secondary)]">
              Conecte o Claude, ChatGPT, OpenClaw ou qualquer cliente compatível e cuide das finanças
              por conversa.
            </p>
            <Link
              href={"/app/configuracoes/integracoes/guia" as Route}
              className="focus-ring mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.22]"
            >
              <BookOpen size={15} strokeWidth={2} aria-hidden />
              Como conectar
            </Link>
          </div>
        ) : (
          connections.map((c) => (
            <Link
              key={c.id}
              href={`/app/configuracoes/integracoes/${c.id}` as Route}
              className={CARD}
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                <Plug size={18} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                  {c.clientName}
                </span>
                <span className="block text-[0.75rem] text-[color:var(--text-muted)]">
                  Conectado em {formatDate(c.createdAt)} · {scopeCountById.get(c.id) ?? 0}{" "}
                  {(scopeCountById.get(c.id) ?? 0) === 1 ? "permissão" : "permissões"}
                </span>
              </span>
              <ChevronRight
                size={18}
                strokeWidth={2}
                className="flex-none text-[color:var(--color-brand-800)]"
                aria-hidden
              />
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[0.6875rem] font-semibold tracking-wide text-[color:var(--text-muted)] uppercase">
          Mais
        </h2>
        <Link href={"/app/configuracoes/integracoes/guia" as Route} className={CARD}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <BookOpen size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              Como conectar
            </span>
            <span className="block text-[0.75rem] text-[color:var(--text-secondary)]">
              URL do conector, passo a passo e permissões.
            </span>
          </span>
          <ChevronRight
            size={18}
            strokeWidth={2}
            className="flex-none text-[color:var(--color-brand-800)]"
            aria-hidden
          />
        </Link>
        <Link href={"/app/configuracoes/integracoes/atividade" as Route} className={CARD}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <History size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              Atividade
            </span>
            <span className="block text-[0.75rem] text-[color:var(--text-secondary)]">
              O que os assistentes fizeram, com opção de desfazer.
            </span>
          </span>
          <ChevronRight
            size={18}
            strokeWidth={2}
            className="flex-none text-[color:var(--color-brand-800)]"
            aria-hidden
          />
        </Link>
      </section>
    </PageShell>
  );
}
