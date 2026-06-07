"use client";

import { ArrowDown, ArrowUp, Crown, Lock, Minus, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { MAX_QUICK_ACCESS } from "@/domain/services/quick-access.service";

import type { CatalogEntry, QuickAccessCategory } from "../../../_components/quick-access/catalog";
import { QUICK_ACCESS_ICONS } from "../../../_components/quick-access/icons";
import { saveQuickAccessAction } from "../_actions/save-quick-access.action";

interface Props {
  isPro: boolean;
  initialKeys: string[];
  catalog: CatalogEntry[];
}

const CATEGORY_LABEL: Record<QuickAccessCategory, string> = {
  adicionar: "Adicionar",
  simular: "Simular",
  navegar: "Navegar",
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const C = QUICK_ACCESS_ICONS[name];
  return C ? <C size={size} strokeWidth={1.75} aria-hidden /> : null;
}

export function QuickAccessEditor({ isPro, initialKeys, catalog }: Props) {
  const [keys, setKeys] = useState<string[]>(initialKeys);
  const [, startTransition] = useTransition();
  const byKey = new Map(catalog.map((e) => [e.key, e]));
  const atMax = keys.length >= MAX_QUICK_ACCESS;

  function persist(next: string[]) {
    setKeys(next);
    startTransition(async () => {
      await saveQuickAccessAction(next);
    });
  }
  function add(key: string) {
    if (!isPro || keys.includes(key) || atMax) return;
    persist([...keys, key]);
  }
  function remove(key: string) {
    if (!isPro) return;
    persist(keys.filter((k) => k !== key));
  }
  function move(index: number, dir: -1 | 1) {
    if (!isPro) return;
    const target = index + dir;
    if (target < 0 || target >= keys.length) return;
    const next = [...keys];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    persist(next);
  }

  const grouped: Record<QuickAccessCategory, CatalogEntry[]> = {
    adicionar: catalog.filter((e) => e.category === "adicionar"),
    simular: catalog.filter((e) => e.category === "simular"),
    navegar: catalog.filter((e) => e.category === "navegar"),
  };

  return (
    <div>
      {!isPro ? (
        <div className="mb-5 flex items-center justify-between gap-2 rounded-[14px] border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.08] px-4 py-3">
          <span className="flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-secondary)]">
            <Lock size={14} strokeWidth={2.25} aria-hidden />
            Personalizar os acessos rápidos é um recurso Pro.
          </span>
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring inline-flex shrink-0 items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2"
          >
            Virar Pro
            <Crown size={12} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      ) : null}

      <div className={isPro ? "" : "opacity-60"}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Seus atalhos
        </h3>
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          {keys.length}/{MAX_QUICK_ACCESS}
        </span>
      </div>

      <ul className="mb-7 flex flex-col gap-2">
        {keys.map((key, i) => {
          const e = byKey.get(key);
          if (!e) return null;
          return (
            <li
              key={key}
              className="flex items-center gap-3 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                <Icon name={e.icon} />
              </span>
              <span className="flex-1 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                {e.label}
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={!isPro || i === 0}
                  aria-label={`Mover ${e.label} para cima`}
                  className="focus-ring flex h-7 w-7 items-center justify-center rounded-[8px] border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] disabled:opacity-40"
                >
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={!isPro || i === keys.length - 1}
                  aria-label={`Mover ${e.label} para baixo`}
                  className="focus-ring flex h-7 w-7 items-center justify-center rounded-[8px] border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] disabled:opacity-40"
                >
                  <ArrowDown size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => remove(key)}
                  disabled={!isPro}
                  aria-label={`Remover ${e.label} dos atalhos`}
                  className="focus-ring flex h-7 w-7 items-center justify-center rounded-[8px] border border-[color:rgba(224,101,79,0.3)] text-[color:#e0654f] disabled:opacity-40"
                >
                  <Minus size={14} aria-hidden />
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mb-2 text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
        Adicionar ao catálogo
      </div>
      {(["simular", "navegar", "adicionar"] as QuickAccessCategory[]).map((cat) => {
        const available = grouped[cat].filter((e) => !keys.includes(e.key));
        if (available.length === 0) return null;
        return (
          <div key={cat} className="mb-4">
            <div className="mb-1.5 px-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
              {CATEGORY_LABEL[cat]}
            </div>
            <ul className="flex flex-col">
              {available.map((e) => (
                <li key={e.key} className="flex items-center gap-3 rounded-[10px] px-1 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                    <Icon name={e.icon} />
                  </span>
                  <span className="flex-1 text-[0.8125rem] text-[color:var(--text-primary)]">
                    {e.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => add(e.key)}
                    disabled={!isPro || atMax}
                    aria-label={`Adicionar ${e.label} aos atalhos`}
                    title={atMax ? `Máximo de ${MAX_QUICK_ACCESS} atalhos` : undefined}
                    className="focus-ring flex h-7 w-7 items-center justify-center rounded-[8px] border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)] disabled:opacity-40"
                  >
                    <Plus size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      </div>
    </div>
  );
}
