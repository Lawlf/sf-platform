import { ChevronDown, ChevronRight, Inbox, Send } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { faqItems } from "@/app/(public)/_lib/faq-items";

import { PageShell } from "../_components/page-shell";
import { countMyContacts } from "../falar-com-a-gente/_actions/my-feedback-queries";

export const metadata: Metadata = { title: "Ajuda e FAQ" };

export default async function AjudaPage() {
  const total = await countMyContacts();

  return (
    <PageShell
      title="Ajuda e FAQ"
      description="Respostas rápidas pras dúvidas mais comuns. Não achou? Fala com a gente."
      backHref={"/app/configuracoes" as Route}
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Falar com a gente
        </h2>

        <Link
          href={"/app/falar-com-a-gente" as Route}
          className="glass-light focus-ring flex items-center gap-3 p-4 transition-colors hover:border-[color:var(--color-brand-500)]/40"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Send size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
              Enviar mensagem
            </span>
            <span className="block text-[0.8125rem] text-[color:var(--text-secondary)]">
              Conta um problema, sugestão ou dúvida.
            </span>
          </span>
          <ChevronRight
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className="flex-none text-[color:var(--text-muted)]"
          />
        </Link>

        {total > 0 ? (
          <Link
            href={"/app/falar-com-a-gente/mensagens" as Route}
            className="glass-light focus-ring flex items-center gap-3 p-4 transition-colors hover:border-[color:var(--color-brand-500)]/40"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]">
              <Inbox size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                Suas mensagens
              </span>
              <span className="block text-[0.8125rem] text-[color:var(--text-secondary)]">
                Veja o que você enviou e as respostas.
              </span>
            </span>
            <span className="flex-none rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[0.75rem] font-bold text-[color:var(--text-secondary)]">
              {total}
            </span>
            <ChevronRight
              size={18}
              strokeWidth={1.75}
              aria-hidden
              className="flex-none text-[color:var(--text-muted)]"
            />
          </Link>
        ) : null}
      </section>

      <section className="glass-light px-4 py-1">
        {faqItems.map((item) => (
          <details key={item.q} className="group border-b border-[color:var(--border-soft)] last:border-b-0">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[0.9375rem] font-semibold text-[color:var(--text-primary)] [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                size={18}
                strokeWidth={2}
                aria-hidden
                className="flex-none text-[color:var(--text-muted)] transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="pb-4 text-[0.875rem] leading-relaxed text-[color:var(--text-secondary)]">
              {item.a}
            </p>
          </details>
        ))}
      </section>
    </PageShell>
  );
}
