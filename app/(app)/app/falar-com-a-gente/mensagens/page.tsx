import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { PageShell } from "../../_components/page-shell";
import { listMyContacts } from "../_actions/my-feedback-queries";

export const metadata: Metadata = { title: "Suas mensagens" };

const KIND_LABELS: Record<string, string> = {
  problema: "Problema",
  sugestao: "Sugestão",
  duvida: "Dúvida",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Em análise",
  respondido: "Respondido",
  fechado: "Encerrado",
};

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function statusClass(status: string): string {
  if (status === "respondido") {
    return "bg-[color:var(--semantic-positive)]/[0.14] text-[color:var(--semantic-positive)]";
  }
  if (status === "fechado") return "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]";
  return "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]";
}

export default async function MinhasMensagensPage() {
  const messages = await listMyContacts();

  return (
    <PageShell
      title="Suas mensagens"
      description="O que você enviou pra gente e as respostas."
      backHref={"/app/falar-com-a-gente" as Route}
    >
      {messages.length === 0 ? (
        <section className="glass-light p-5 text-sm text-[color:var(--text-secondary)]">
          Você ainda não enviou nenhuma mensagem.
        </section>
      ) : (
        messages.map((m) => (
          <Link
            key={m.id}
            href={`/app/falar-com-a-gente/mensagens/${m.id}` as Route}
            className="glass-light focus-ring flex items-center gap-3 p-4 transition-colors hover:border-[color:var(--color-brand-500)]/40"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  {m.kind ? (KIND_LABELS[m.kind] ?? "Mensagem") : "Mensagem"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${statusClass(m.status)}`}
                >
                  {STATUS_LABELS[m.status] ?? m.status}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[0.8125rem] text-[color:var(--text-secondary)]">
                {m.comment ?? "(sem mensagem)"}
              </span>
              <span className="mt-0.5 block text-[0.6875rem] text-[color:var(--text-muted)]">
                {DATE_FMT.format(m.createdAt)}
                {m.hasReply ? " · tem resposta" : ""}
              </span>
            </span>
            <ChevronRight
              size={18}
              strokeWidth={1.75}
              aria-hidden
              className="flex-none text-[color:var(--text-muted)]"
            />
          </Link>
        ))
      )}
    </PageShell>
  );
}
