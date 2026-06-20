import { ChevronRight, Inbox } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { PageShell } from "../_components/page-shell";

import { countMyContacts } from "./_actions/my-feedback-queries";
import { ContactForm } from "./_components/contact-form.client";

export const metadata: Metadata = { title: "Falar com a gente" };

export default async function FalarComAGentePage() {
  const total = await countMyContacts();

  return (
    <PageShell
      title="Falar com a gente"
      description="Achou algo confuso, faltando ou quebrado? Conta o que aconteceu. A gente lê tudo e responde aqui no app em alguns dias."
      backHref={"/app/ajuda" as Route}
    >
      <ContactForm />

      {total > 0 ? (
        <Link
          href={"/app/falar-com-a-gente/mensagens" as Route}
          className="focus-ring mt-1 flex items-center gap-3 border-t border-[color:var(--border-soft)] pt-4 text-[0.8125rem] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
        >
          <Inbox size={16} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
          <span className="flex-1">Suas mensagens ({total})</span>
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
        </Link>
      ) : null}
    </PageShell>
  );
}
