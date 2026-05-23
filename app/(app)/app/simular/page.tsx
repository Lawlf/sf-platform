import { Calculator, ChevronRight, Layers, ShoppingBag, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PageShell } from "../_components/page-shell";

interface SimulatorItem {
  href: Route;
  title: string;
  desc: string;
  icon: LucideIcon;
}

const SIMULATORS: readonly SimulatorItem[] = [
  {
    href: "/app/simular/quitacao" as Route,
    title: "Projeção de quitação",
    desc: "Quando uma dívida termina?",
    icon: Calculator,
  },
  {
    href: "/app/simular/extra" as Route,
    title: "Pagar extra",
    desc: "Quanto economizo pagando mais?",
    icon: TrendingUp,
  },
  {
    href: "/app/simular/estrategia" as Route,
    title: "Snowball vs Avalanche",
    desc: "Qual ordem rende mais?",
    icon: Layers,
  },
  {
    href: "/app/simular/compra" as Route,
    title: "Vale a pena comprar?",
    desc: "Compare comprar vs investir.",
    icon: ShoppingBag,
  },
] as const;

export default function SimularHubPage() {
  return (
    <PageShell title="Simular" description="Compare cenários e estratégias.">
      <div className="flex flex-col gap-3">
        {SIMULATORS.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="focus-ring flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                <Icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <div className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                  {title}
                </div>
                <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">{desc}</div>
              </div>
            </div>
            <ChevronRight
              size={18}
              strokeWidth={2}
              className="text-[color:var(--color-brand-800)]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
