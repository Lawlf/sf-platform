import { ExternalLink } from "lucide-react";

import type { BookSpec } from "../_lib/trilhas";

export interface BookCardProps {
  book: BookSpec;
}

export function BookCard({ book }: BookCardProps) {
  return (
    <article
      className="flex gap-3.5 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-lg"
      style={{ boxShadow: "0 4px 16px -4px rgba(31,29,28,0.05)" }}
    >
      <div
        className="relative flex h-[100px] w-[70px] shrink-0 flex-col justify-between rounded-[6px] p-2"
        style={{
          background:
            "linear-gradient(160deg, #2a2725 0%, #3a3633 50%, #1f1d1c 100%)",
          color: "#fdf8f3",
          boxShadow:
            "0 8px 18px rgba(31,29,28,0.18), inset 1px 0 0 rgba(255,255,255,0.06), inset -1px 0 0 rgba(0,0,0,0.2)",
        }}
      >
        <div>
          <div className="text-[0.4375rem] font-bold uppercase tracking-[0.1em] text-white/50">
            {book.publisher}
          </div>
          <div className="mt-1 font-serif text-[0.625rem] font-bold leading-[1.15] tracking-[-0.01em] text-white">
            {book.title}
          </div>
        </div>
        <div className="font-serif text-[0.46875rem] italic text-white/70">{book.author}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
          Pra essa trilha
        </div>
        <h3 className="font-serif text-[0.9375rem] font-bold leading-[1.2] tracking-[-0.01em] text-[color:var(--text-primary)]">
          {book.title}
        </h3>
        <p className="mb-2 mt-0.5 text-[0.75rem] italic text-[color:var(--text-secondary)]">
          {book.author} · {book.publisher}
        </p>
        <p className="mb-2.5 text-[0.75rem] leading-[1.45] text-[color:var(--text-secondary)]">
          {book.why}
        </p>
        {book.amazonUrl ? (
          <a
            href={book.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.6875rem] font-bold text-[color:var(--color-brand-800)] hover:underline"
          >
            Comprar na Amazon
            <ExternalLink size={11} strokeWidth={2.2} aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}
