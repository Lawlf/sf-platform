"use client";

import { ChevronRight, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  SETTINGS_ADVANCED_SECTIONS,
  SETTINGS_SECTIONS,
  type SettingSection,
} from "../../_lib/settings-items";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function filterSections(sections: SettingSection[], normalizedQuery: string): SettingSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        normalize(`${item.label} ${item.description} ${(item.keywords ?? []).join(" ")}`).includes(
          normalizedQuery,
        ),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function SettingsList() {
  const [query, setQuery] = useState("");

  const normalizedQuery = normalize(query.trim());
  const visibleSections = filterSections(
    [...SETTINGS_SECTIONS, ...SETTINGS_ADVANCED_SECTIONS],
    normalizedQuery,
  );

  return (
    <>
      <div className="relative">
        <Search
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[color:var(--text-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar nas configurações"
          className="focus-ring w-full rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] py-3 pl-11 pr-4 text-[0.875rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] backdrop-blur-xl"
        />
      </div>

      {visibleSections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-6 py-12 text-center backdrop-blur-xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <SearchX size={24} strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <div className="text-[1rem] font-extrabold text-[color:var(--text-primary)]">
              Nada por aqui
            </div>
            <div className="mt-1 text-[0.8125rem] text-[color:var(--text-muted)]">
              Nenhuma configuração com &ldquo;{query.trim()}&rdquo;. Tenta outra palavra.
            </div>
          </div>
        </div>
      ) : (
        visibleSections.map((section) => <SectionView key={section.title} section={section} />)
      )}
    </>
  );
}

function SectionView({ section }: { section: SettingSection }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {section.title}
      </h2>
      <div className="flex flex-col gap-2">
        {section.items.map((item) => {
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <div
                key={item.label}
                aria-disabled
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-4 opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.10] text-[color:var(--color-brand-800)]">
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                    {item.label}
                  </div>
                  <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-muted)]">
                    {item.description}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                <Icon size={18} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="flex-1">
                <div className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  {item.label}
                </div>
                <div className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
                  {item.description}
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
        })}
      </div>
    </section>
  );
}
