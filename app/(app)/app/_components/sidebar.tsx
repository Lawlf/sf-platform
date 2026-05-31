"use client";

import {
  Coins,
  HomeIcon,
  LineChart,
  PanelRightClose,
  PanelRightOpen,
  PlusCircle,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/app/components/icons/brand-logo";
import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { ImmersiveSidebar } from "../conteudo/_components/immersive-sidebar";

interface NavItem {
  href: Route;
  label: string;
  icon: typeof HomeIcon;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app" as Route, label: "Início", icon: HomeIcon, exact: true },
  { href: "/app/renda" as Route, label: "Renda", icon: TrendingUp },
  { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
  { href: "/app/patrimonio" as Route, label: "Patrimônio", icon: Coins },
  { href: "/app/metas" as Route, label: "Metas", icon: Target },
  { href: "/app/linha-do-tempo" as Route, label: "Linha do tempo", icon: LineChart },
  { href: "/app/simular" as Route, label: "Simular", icon: PlusCircle },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const STORAGE_KEY = "sf_sidebar_collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const isOnConteudoImmersive =
    pathname.startsWith("/app/conteudo/trilha") ||
    pathname.startsWith("/app/conteudo/livros") ||
    pathname.startsWith("/app/conteudo/ritmo");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored === "1";
    setCollapsed(next);
    document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      document.documentElement.dataset.sidebar = next ? "collapsed" : "expanded";
      return next;
    });
  }

  const toggleButton = (
    <SimpleTooltip
      label={collapsed ? "Expandir menu" : "Minimizar menu"}
      side={collapsed ? "right" : "bottom"}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expandir menu" : "Minimizar menu"}
        className="focus-ring flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
      >
        {collapsed ? (
          <PanelRightClose size={16} strokeWidth={1.75} aria-hidden />
        ) : (
          <PanelRightOpen size={16} strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </SimpleTooltip>
  );

  return (
    <aside
      aria-label="Navegação principal"
      data-collapsed={collapsed ? "true" : "false"}
      className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-[var(--sidebar-w)] md:flex-col md:border-r md:border-[color:var(--border-soft)] md:bg-[color:var(--surface-3)] md:px-3 md:py-6 md:[backdrop-filter:blur(24px)_saturate(180%)] md:transition-[width] md:duration-200"
    >
      <div
        className={`mb-6 flex items-center ${collapsed ? "flex-col gap-3" : "justify-between gap-2 px-2"}`}
      >
        <Link
          href={"/app" as Route}
          aria-label="Sabor Financeiro"
          className="flex items-center gap-2"
        >
          <BrandLogo size={32} />
          {!collapsed ? (
            <span className="text-[0.875rem] font-bold tracking-tight text-[color:var(--color-brand-800)]">
              Sabor Financeiro
            </span>
          ) : null}
        </Link>
        {toggleButton}
      </div>
      {isOnConteudoImmersive && !collapsed ? (
        <ImmersiveSidebar activeTrilha={null} />
      ) : (
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            const cls = active
              ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
              : "text-[color:var(--text-primary)] hover:bg-[color:var(--color-brand-500)]/[0.08]";
            const link = (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`focus-ring relative flex items-center rounded-lg text-[0.875rem] font-medium transition-colors ${cls} ${
                  collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {!collapsed ? <span className="flex-1">{item.label}</span> : null}
              </Link>
            );
            return collapsed ? (
              <SimpleTooltip key={item.href} label={item.label} side="right">
                {link}
              </SimpleTooltip>
            ) : (
              <div key={item.href}>{link}</div>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
