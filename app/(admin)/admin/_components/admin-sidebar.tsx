"use client";

import { Activity, DollarSign, LayoutDashboard, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin" as Route, label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/faturamento" as Route, label: "Faturamento", icon: DollarSign },
  { href: "/admin/uso" as Route, label: "Uso", icon: Activity },
  { href: "/admin/usuarios" as Route, label: "Usuários", icon: Users },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Navegação do admin"
      className="flex w-[var(--sidebar-w)] flex-shrink-0 flex-col border-r border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4"
    >
      <span className="block px-3 pb-3 text-[0.75rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
        Sabor · Admin
      </span>
      <nav aria-label="Links do admin" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem] font-semibold transition-colors ${
                active
                  ? "bg-[color:var(--surface-2)] text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-2)]"
              }`}
            >
              <Icon size={16} strokeWidth={2.2} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
