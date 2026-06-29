"use client";

import { Building2, Coins, HomeIcon, Plus, TrendingUp, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AddIntentSheet } from "./add-intent-sheet.client";

interface NavItem {
  href: Route;
  label: string;
  icon: typeof HomeIcon;
  exact?: boolean;
}

// O FAB central abre o hub de intenção ("o que você quer registrar?"), a ação
// núcleo do app. "Simular" saiu daqui (exploração, não ação primária) e vive nos
// acessos rápidos.
const PF_NAV_ITEMS: NavItem[] = [
  { href: "/app" as Route, label: "Início", icon: HomeIcon, exact: true },
  { href: "/app/renda" as Route, label: "Renda", icon: TrendingUp },
  { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
  { href: "/app/patrimonio" as Route, label: "Patrimônio", icon: Coins },
];

const PJ_NAV_ITEMS: NavItem[] = [
  { href: "/app" as Route, label: "Início", icon: HomeIcon, exact: true },
  { href: "/app/renda" as Route, label: "Faturamento", icon: TrendingUp },
  { href: "/app/mei" as Route, label: "Salário", icon: Building2 },
  { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav({ activeIsPj }: { activeIsPj: boolean }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const navItems = activeIsPj ? PJ_NAV_ITEMS : PF_NAV_ITEMS;
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  function renderItem(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(pathname, item);
    const labelColor = active
      ? "text-[color:var(--color-brand-800)]"
      : "text-[color:var(--text-primary)]";
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`focus-ring relative flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[0.8125rem] transition-colors ${labelColor}`}
      >
        {active ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(242,142,37,0.28) 0%, rgba(242,142,37,0.12) 40%, transparent 75%)",
              filter: "blur(6px)",
            }}
          />
        ) : null}
        <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
        <span className={active ? "font-bold" : ""}>{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      <nav
        aria-label="Navegação rápida"
        className="glass-floating fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-1/2 z-20 flex h-[72px] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-end justify-around px-2 py-2"
      >
        {leftItems.map(renderItem)}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Adicionar"
          aria-haspopup="dialog"
          aria-expanded={addOpen}
          className="focus-ring -mt-6 flex flex-col items-center gap-1"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_8px_24px_rgba(239,122,26,0.4)]">
            <Plus className="h-8 w-8" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)]">
            Adicionar
          </span>
        </button>
        {rightItems.map(renderItem)}
      </nav>
      <AddIntentSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
