import { PiggyBank } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface SimEmptyStateProps {
  message: string;
  ctaHref?: Route;
  ctaLabel?: string;
}

/** Estado vazio dos simuladores que dependem de dívidas cadastradas. */
export function SimEmptyState({ message, ctaHref, ctaLabel }: SimEmptyStateProps) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-8 text-center backdrop-blur-xl">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
        aria-hidden
      >
        <PiggyBank size={24} strokeWidth={1.75} />
      </span>
      <p className="max-w-xs text-[0.875rem] text-[color:var(--text-secondary)]">{message}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="focus-ring inline-flex items-center rounded-full bg-[color:var(--color-brand-500)] px-4 py-2 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[color:var(--color-brand-600)]"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
