import { ArrowRight, Coins } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function LinkedAssetCard({ assets }: { assets: { id: string; label: string }[] }) {
  if (assets.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-[color:var(--text-primary)]">
        {assets.length === 1 ? "Bem ligado a essa dívida" : "Bens ligados a essa dívida"}
      </h2>
      {assets.map((a) => (
        <Link
          key={a.id}
          href={`/app/patrimonio/${a.id}` as Route}
          className="focus-ring flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-1)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Coins size={16} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {a.label}
            </div>
            <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
              Ver o custo total
            </div>
          </div>
          <ArrowRight size={14} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
        </Link>
      ))}
    </section>
  );
}
