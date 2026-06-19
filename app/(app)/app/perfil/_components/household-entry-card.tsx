import { ChevronRight, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function HouseholdEntryCard({ hasHousehold }: { hasHousehold: boolean }) {
  return (
    <Link
      href={"/app/lar" as Route}
      className="focus-ring flex items-center gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)]"
    >
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Users size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
          {hasHousehold ? "Nosso lar" : "Divide as finanças com alguém?"}
        </div>
        <div className="mt-0.5 text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
          {hasHousehold
            ? "Veja a visão de vocês e gerencie quem participa."
            : "Junte a renda e o patrimônio do casal numa visão só. Você escolhe o que o outro vê, por padrão nada é compartilhado."}
        </div>
      </div>
      <ChevronRight
        size={18}
        strokeWidth={2}
        className="flex-none text-[color:var(--text-muted)]"
        aria-hidden
      />
    </Link>
  );
}
