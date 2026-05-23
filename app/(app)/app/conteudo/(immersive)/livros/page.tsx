import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { BookCard } from "../../_components/book-card";
import { TRILHAS } from "../../_lib/trilhas";

export const metadata: Metadata = { title: "Livros" };

export default async function ConteudoLivrosPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="mb-2 inline-flex items-center gap-1.5 text-[0.65625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
          <span
            className="block h-[1.5px] w-3.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
          />
          Leitura curada
        </div>
        <h1 className="font-serif text-[1.75rem] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)] md:text-[2.125rem]">
          Livros que combinam com a trilha
        </h1>
        <p className="mt-2 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Curadoria que evita finfluencer e ancora no concreto.
        </p>
      </header>

      {TRILHAS.map((trilha) => (
        <section key={trilha.slug}>
          <div className="mb-2 px-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            {trilha.title}
          </div>
          {trilha.books.length > 0 ? (
            <div className="flex flex-col gap-3">
              {trilha.books.map((book) => (
                <BookCard key={book.title} book={book} />
              ))}
            </div>
          ) : (
            <p className="rounded-[14px] border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-[0.75rem] text-[color:var(--text-muted)]">
              Curadoria chegando. A gente avisa.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
