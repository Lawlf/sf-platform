import { BookOpen, HomeIcon, type LucideIcon, PlusCircle, UserRound, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  isFab?: boolean;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/app" as Route, label: "Início", icon: HomeIcon },
  { href: "/app/dividas" as Route, label: "Dívidas", icon: Wallet },
  { href: "/app/simular" as Route, label: "Simular", icon: PlusCircle, isFab: true },
  { href: "/app/conteudo" as Route, label: "Conteúdo", icon: BookOpen },
  { href: "/app/perfil" as Route, label: "Perfil", icon: UserRound },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegacao principal"
      className="glass-light fixed bottom-2 left-2 right-2 z-20 mx-auto flex max-w-md items-stretch justify-around px-2 py-2"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-xs text-[color:var(--color-charcoal-900)] transition-colors hover:bg-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
          >
            <Icon
              className={item.isFab ? "h-7 w-7 text-[color:var(--color-brand-600)]" : "h-5 w-5"}
              strokeWidth={1.75}
              aria-hidden
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
