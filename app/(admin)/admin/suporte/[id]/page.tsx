import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fmtDate } from "../../_lib/format";
import { getFeedback } from "../_actions/feedback-queries";
import { ReplyForm } from "../_components/reply-form.client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const KIND_LABELS: Record<string, string> = {
  problema: "Problema",
  sugestao: "Sugestão",
  duvida: "Dúvida",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  fechado: "Fechado",
};

function typeLabel(kind: string | null, sentiment: "up" | "down" | null): string {
  if (kind) return KIND_LABELS[kind] ?? kind;
  if (sentiment === "up") return "Joinha positivo";
  if (sentiment === "down") return "Joinha negativo";
  return "Feedback";
}

export default async function SuporteDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getFeedback(id);
  if (!item) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href={"/admin/suporte" as Route}
        className="text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      >
        ← Voltar
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
          {typeLabel(item.kind, item.sentiment)}
        </h1>
        <p className="text-[0.8125rem] text-[color:var(--text-muted)]">
          {item.userName ? `${item.userName} · ` : ""}
          {item.userEmail ?? "-"} · {fmtDate(item.createdAt)} ·{" "}
          {STATUS_LABELS[item.status] ?? item.status}
        </p>
        <p className="text-[0.75rem] text-[color:var(--text-muted)]">Origem: {item.surface}</p>
      </div>

      <section className="glass-light rounded-2xl p-4">
        <p className="whitespace-pre-wrap text-[0.875rem] text-[color:var(--text-primary)]">
          {item.comment ?? "(sem mensagem)"}
        </p>
        {item.attachmentUrls.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {item.attachmentUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Anexo ${i + 1}`}
                  className="h-24 w-24 rounded-lg border border-[color:var(--border-soft)] object-cover"
                />
              </a>
            ))}
          </div>
        ) : null}
      </section>

      {item.adminReply ? (
        <section className="rounded-2xl border border-[color:var(--border-soft)] p-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Sua resposta {item.answeredAt ? `· ${fmtDate(item.answeredAt)}` : ""}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[0.875rem] text-[color:var(--text-secondary)]">
            {item.adminReply}
          </p>
        </section>
      ) : null}

      <ReplyForm feedbackId={item.id} status={item.status} hasReply={item.adminReply !== null} />
    </div>
  );
}
