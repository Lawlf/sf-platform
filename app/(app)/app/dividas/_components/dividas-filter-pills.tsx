"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const FILTERS = [
  { id: "active", label: "Ativas" },
  { id: "paid_off", label: "Quitadas" },
  { id: "all", label: "Todas" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function DividasFilterPills() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = (params.get("status") as FilterId | null) ?? "active";

  function setFilter(id: FilterId) {
    const href = id === "active" ? "/app/dividas" : `/app/dividas?status=${id}`;
    startTransition(() => {
      router.push(href as Route);
    });
  }

  return (
    <nav aria-label="Filtrar por status" className="flex gap-2 overflow-x-auto pb-1">
      {FILTERS.map((f) => {
        const active = current === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            disabled={pending}
            aria-current={active ? "page" : undefined}
            className={`focus-ring shrink-0 rounded-full px-4 py-1.5 text-[0.75rem] font-semibold transition-colors disabled:opacity-70 ${
              active
                ? "bg-[color:var(--color-brand-500)] text-white shadow-[0_2px_8px_rgba(239,122,26,0.25)]"
                : "border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)]"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </nav>
  );
}
