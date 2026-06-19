import { ChevronRight, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function HouseholdGoalNudge() {
  return (
    <Link
      href={"/app/lar" as Route}
      className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)]"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Users size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
          Essa meta é de vocês dois?
        </div>
        <div className="mt-0.5 text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
          Some a renda do casal e veja quanto falta juntos, no Nosso lar.
        </div>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={2}
        className="flex-none text-[color:var(--text-muted)]"
        aria-hidden
      />
    </Link>
  );
}
