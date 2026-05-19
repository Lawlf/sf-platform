import type { Route } from "next";
import Link from "next/link";

import { PageShell } from "../_components/page-shell";

const SIMULATORS = [
  {
    href: "/app/simular/quitacao",
    title: "Projeção de quitação",
    desc: "Quando uma dívida termina?",
  },
  { href: "/app/simular/extra", title: "Pagar extra", desc: "Quanto economizo pagando mais?" },
  {
    href: "/app/simular/estrategia",
    title: "Snowball vs Avalanche",
    desc: "Qual ordem rende mais?",
  },
] as const;

export default function SimularHubPage() {
  return (
    <PageShell title="Simular" description="Compare cenários e estratégias.">
      <div className="flex flex-col gap-3">
        {SIMULATORS.map((s) => (
          <Link
            key={s.href}
            href={s.href as Route}
            className="glass-light flex flex-col gap-1 p-4 transition-colors hover:bg-white/70"
          >
            <span className="text-sm font-semibold text-[color:var(--color-brand-800)]">
              {s.title}
            </span>
            <span className="text-xs opacity-70">{s.desc}</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
