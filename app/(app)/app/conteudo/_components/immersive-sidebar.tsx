"use client";

import { BookMarked, BookOpen, ChevronLeft, LineChart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { TRILHAS } from "../_lib/trilhas";

interface SideItem {
  href: Route;
  label: string;
  icon: typeof BookOpen;
  exact?: boolean;
}

const RESOURCES: readonly SideItem[] = [
  { href: "/app/conteudo/livros" as Route, label: "Livros", icon: BookMarked },
  { href: "/app/conteudo/ritmo" as Route, label: "Seu ritmo", icon: LineChart },
];

function isActive(pathname: string, item: SideItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function ImmersiveSidebar({ activeTrilha }: { activeTrilha: string | null }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      <Link
        href={"/app" as Route}
        className="focus-ring mb-2 flex items-center gap-2 rounded-lg border-b border-[color:var(--border-soft)] px-3 pb-3 text-[13px] font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden />
        Voltar pro app
      </Link>

      <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
        Trilha atual
      </div>
      {TRILHAS.map((t) => {
        const active = activeTrilha === t.slug;
        const cls = active
          ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
          : "text-[color:var(--text-primary)] hover:bg-[color:var(--color-brand-500)]/[0.08]";
        return (
          <span
            key={t.slug}
            className={`focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${cls}`}
          >
            <BookOpen size={16} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
            <span className="flex-1">{t.title}</span>
          </span>
        );
      })}

      <div className="mt-2 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
        Recursos
      </div>
      {RESOURCES.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item);
        const cls = active
          ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
          : "text-[color:var(--text-primary)] hover:bg-[color:var(--color-brand-500)]/[0.08]";
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${cls}`}
          >
            <Icon size={16} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
