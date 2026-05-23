"use client";

import { BookOpen, Coins, HomeIcon, PlusCircle, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: Route;
  label: string;
  icon: typeof HomeIcon;
  fab?: boolean;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app" as Route, label: "Início", icon: HomeIcon, exact: true },
  { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
  { href: "/app/simular" as Route, label: "Simular", icon: PlusCircle, fab: true },
  { href: "/app/patrimonio" as Route, label: "Patrimônio", icon: Coins },
  { href: "/app/conteudo" as Route, label: "Conteúdo", icon: BookOpen },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="glass-tier-2 fixed bottom-2 left-2 right-2 z-20 mx-auto flex max-w-md items-end justify-around px-2 py-2"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item);
        if (item.fab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="focus-ring -mt-6 flex flex-col items-center gap-1"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_8px_24px_rgba(239,122,26,0.4)]">
                <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-[11px] font-semibold text-[color:var(--color-brand-700)]">
                {item.label}
              </span>
            </Link>
          );
        }
        const labelColor = active
          ? "text-[color:var(--color-brand-800)]"
          : "text-[color:var(--text-primary)]";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`focus-ring relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-xs transition-colors ${labelColor}`}
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
            <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
            <span className={active ? "font-bold" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
