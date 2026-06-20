import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "../../../_components/page-shell";
import { getMyContact } from "../../_actions/my-feedback-queries";

export const metadata: Metadata = { title: "Mensagem" };

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

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MensagemDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const item = await getMyContact(id);
  if (!item) notFound();

  return (
    <PageShell
      title={item.kind ? (KIND_LABELS[item.kind] ?? "Mensagem") : "Mensagem"}
      description={`Enviada em ${DATE_FMT.format(item.createdAt)} · ${STATUS_LABELS[item.status] ?? item.status}`}
      backHref={"/app/falar-com-a-gente/mensagens" as Route}
    >
      <section className="glass-light flex flex-col gap-3 p-4">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Você escreveu
        </p>
        <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-[color:var(--text-primary)]">
          {item.comment ?? "(sem mensagem)"}
        </p>
        {item.attachmentUrls.length > 0 ? (
          <div className="flex flex-wrap gap-3">
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
        <section className="flex flex-col gap-2 rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.06] p-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--color-brand-800)]">
            Resposta do Sabor {item.answeredAt ? `· ${DATE_FMT.format(item.answeredAt)}` : ""}
          </p>
          <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-[color:var(--text-primary)]">
            {item.adminReply}
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] p-4 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Ainda sem resposta. A gente te avisa por aqui quando responder.
        </section>
      )}
    </PageShell>
  );
}
