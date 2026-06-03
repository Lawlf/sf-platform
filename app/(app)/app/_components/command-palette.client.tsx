"use client";

import {
  Bell,
  Coins,
  HomeIcon,
  LineChart,
  PlusCircle,
  Search,
  Settings,
  Target,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export const OPEN_SEARCH_EVENT = "sf:open-search";

export function openSearch(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}

interface Command {
  href: Route;
  label: string;
  hint: string;
  icon: typeof HomeIcon;
}

const COMMANDS: Command[] = [
  { href: "/app" as Route, label: "Início", hint: "Visão geral", icon: HomeIcon },
  { href: "/app/renda" as Route, label: "Renda", hint: "Visão geral", icon: TrendingUp },
  { href: "/app/dividas" as Route, label: "Dívidas", hint: "Visão geral", icon: Wallet },
  { href: "/app/patrimonio" as Route, label: "Patrimônio", hint: "Visão geral", icon: Coins },
  { href: "/app/metas" as Route, label: "Metas", hint: "Planejar", icon: Target },
  { href: "/app/linha-do-tempo" as Route, label: "Linha do tempo", hint: "Planejar", icon: LineChart },
  { href: "/app/simular" as Route, label: "Simular", hint: "Planejar", icon: PlusCircle },
  { href: "/app/notificacoes" as Route, label: "Notificações", hint: "Conta", icon: Bell },
  { href: "/app/perfil" as Route, label: "Perfil e conta", hint: "Conta", icon: UserRound },
  { href: "/app/configuracoes" as Route, label: "Configurações", hint: "Conta", icon: Settings },
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => normalize(`${c.label} ${c.hint}`).includes(q));
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function go(href: Route) {
    setOpen(false);
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) go(item.href);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisar"
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-start md:p-4 md:pt-[12vh]"
      onMouseDown={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-[color:var(--bg-app)]/55 backdrop-blur-sm" aria-hidden />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full overflow-hidden rounded-t-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] shadow-[0_32px_70px_-20px_rgba(31,29,28,0.5)] [backdrop-filter:blur(24px)_saturate(180%)] md:max-w-[34rem] md:rounded-2xl"
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-[color:var(--border-strong)] md:hidden" aria-hidden />
        <div className="flex items-center gap-2.5 border-b border-[color:var(--border-soft)] px-4">
          <Search size={18} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar seções..."
            className="flex-1 bg-transparent py-3.5 text-[0.9375rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
          <kbd className="hidden flex-none rounded border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)] md:block">
            Esc
          </kbd>
        </div>

        <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[0.8125rem] text-[color:var(--text-muted)]">
              Nada encontrado. Busca por dívidas e metas chega em breve.
            </p>
          ) : (
            results.map((c, i) => {
              const Icon = c.icon;
              const isActive = i === active;
              return (
                <button
                  key={c.href}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c.href)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-[color:var(--color-brand-500)]/[0.12]"
                      : "hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden
                    className={`flex-none ${isActive ? "text-[color:var(--color-brand-800)]" : "text-[color:var(--text-muted)]"}`}
                  />
                  <span className="flex-1 text-[0.875rem] font-medium text-[color:var(--text-primary)]">
                    {c.label}
                  </span>
                  <span className="text-[0.6875rem] text-[color:var(--text-muted)]">{c.hint}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
