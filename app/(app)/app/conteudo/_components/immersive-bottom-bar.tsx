"use client";

import { BookMarked, ChevronLeft, BookOpen, LineChart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BarItem {
  href: Route;
  label: string;
  icon: typeof BookOpen;
  exact?: boolean;
}

const ITEMS: readonly BarItem[] = [
  { href: "/app" as Route, label: "App", icon: ChevronLeft, exact: true },
  { href: "/app/conteudo/trilha" as Route, label: "Trilha", icon: BookOpen, exact: true },
  { href: "/app/conteudo/livros" as Route, label: "Livros", icon: BookMarked },
  { href: "/app/conteudo/ritmo" as Route, label: "Ritmo", icon: LineChart },
];

function isActive(pathname: string, item: BarItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function ImmersiveBottomBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação do conteúdo"
      className="fixed bottom-2 left-2 right-2 z-20 mx-auto flex max-w-md items-center justify-around rounded-[22px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-2 py-2 backdrop-blur-xl"
      style={{ boxShadow: "0 16px 40px -8px rgba(31,29,28,0.12)" }}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item);
        const labelColor = active
          ? "text-[color:var(--color-brand-800)]"
          : "text-[color:var(--text-secondary)]";
        const iconBg = active
          ? "bg-[color:var(--color-brand-500)]/[0.16] text-[color:var(--color-brand-800)]"
          : "text-[color:var(--text-secondary)]";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`focus-ring flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[0.625rem] font-semibold transition-colors ${labelColor}`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-[10px] transition-colors ${iconBg}`}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2 : 1.75} aria-hidden />
            </span>
            <span className={active ? "font-bold" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
