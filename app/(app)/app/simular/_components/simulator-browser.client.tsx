"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { MaisCard } from "../../_components/mais-card";
import {
  searchSimulators,
  simulatorsByCategory,
  type SimulatorMeta,
} from "../_lib/simulators";

function Card({ s }: { s: SimulatorMeta }) {
  return <MaisCard href={s.href} icon={s.icon} title={s.title} description={s.desc} />;
}

export function SimulatorBrowser() {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => simulatorsByCategory(), []);
  const results = useMemo(() => searchSimulators(query), [query]);
  const searching = query.trim() !== "";

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search
          size={18}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
        />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar simulador..."
          aria-label="Buscar simulador"
          className="w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] py-[12px] pl-11 pr-[14px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </div>

      {searching ? (
        results.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((s) => (
              <Card key={s.id} s={s} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-[0.875rem] text-[color:var(--text-secondary)]">
            Nenhum simulador encontrado para “{query.trim()}”.
          </p>
        )
      ) : (
        groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-3">
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--text-muted)]">
              {group.label}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((s) => (
                <Card key={s.id} s={s} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
