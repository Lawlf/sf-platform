import { ChevronRight, LineChart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function TimelineLink() {
  return (
    <Link
      href={"/app/linha-do-tempo" as Route}
      className="focus-ring flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <LineChart size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <div className="text-[14px] font-bold text-[color:var(--text-primary)]">
            Linha do tempo
          </div>
          <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
            Sua trajetória mês a mês: renda, dívidas, patrimônio.
          </div>
        </div>
      </div>
      <ChevronRight
        size={18}
        strokeWidth={2}
        className="text-[color:var(--color-brand-800)]"
        aria-hidden
      />
    </Link>
  );
}
