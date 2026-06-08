import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { FILES_COPY } from "./copy";

export function AttachmentsPaywall() {
  return (
    <div className="rounded-2xl border border-[color:var(--color-brand-500)]/20 bg-[color:var(--surface-2)] p-4">
      <p className="text-[0.75rem] font-semibold text-[color:var(--color-brand-700)]">
        {FILES_COPY.paywallEyebrow}
      </p>
      <h3 className="mt-1 text-[0.9375rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
        {FILES_COPY.paywallTitle}
      </h3>
      <p className="mt-1.5 text-[0.8125rem] leading-[1.5] text-[color:var(--text-secondary)]">
        {FILES_COPY.paywallBody}
      </p>
      <Link
        href={"/app/configuracoes/planos" as Route}
        className="focus-ring mt-4 inline-flex items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
        style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
      >
        {FILES_COPY.paywallButton}
        <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
      </Link>
    </div>
  );
}
