"use client";

import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { RevealOnScroll } from "../../_components/reveal-on-scroll";
import {
  publicCalculatorsByCategory,
  searchPublicCalculators,
  type PublicCalculatorCard,
} from "../_lib/public-calculators-view";

function CalcCard({ item }: { item: PublicCalculatorCard }) {
  return (
    <Link
      href={`/calculadora/${item.slug}`}
      className="sf-lift focus-ring group relative flex h-full items-start gap-3.5 overflow-hidden rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
      style={{ boxShadow: "var(--shadow-glass-strong)" }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-700)]"
        aria-hidden
      >
        <item.Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-col pr-5">
        <span
          className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]"
          style={{ letterSpacing: "-0.01em" }}
        >
          {item.title}
        </span>
        <span className="mt-0.5 text-[0.78rem] leading-snug text-[color:var(--text-secondary)]">
          {item.desc}
        </span>
      </span>
      <ArrowUpRight
        size={16}
        strokeWidth={2}
        aria-hidden
        className="absolute right-3.5 top-3.5 text-[color:var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}

export function CalcBrowser() {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => publicCalculatorsByCategory(), []);
  const results = useMemo(() => searchPublicCalculators(query), [query]);
  const searching = query.trim() !== "";

  return (
    <div className="flex flex-col gap-10">
      <div className="relative">
        <Search
          size={18}
          strokeWidth={2}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[color:var(--text-secondary)]"
        />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar calculadora..."
          aria-label="Buscar calculadora"
          className="w-full rounded-2xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] py-3.5 pl-12 pr-4 text-[0.9375rem] text-[color:var(--text-primary)] backdrop-blur-xl outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </div>

      {searching ? (
        results.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((item) => (
              <li key={item.slug}>
                <CalcCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-[0.875rem] text-[color:var(--text-secondary)]">
            Nada encontrado para “{query.trim()}”. Tente outro termo.
          </p>
        )
      ) : (
        groups.map((group) => (
          <section key={group.id}>
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-brand-700)]">
              {group.label}
            </h2>
            <RevealOnScroll
              as="ul"
              stagger
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {group.items.map((item) => (
                <li key={item.slug}>
                  <CalcCard item={item} />
                </li>
              ))}
            </RevealOnScroll>
          </section>
        ))
      )}
    </div>
  );
}
