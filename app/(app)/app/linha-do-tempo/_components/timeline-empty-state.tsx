import { LineChart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function TimelineEmptyState() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <LineChart size={28} strokeWidth={1.5} aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-bold text-[color:var(--text-primary)]">
          Sua linha do tempo está só começando
        </h3>
        <p className="mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">
          Continue cadastrando renda e pagamentos. Em alguns meses sua trajetória aparece aqui.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href={"/app/renda/nova" as Route}
          className="focus-ring inline-flex items-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2.5 text-[0.8125rem] font-bold text-white shadow-[0_4px_12px_rgba(239,122,26,0.25)] transition hover:brightness-105"
        >
          Adicionar renda
        </Link>
        <Link
          href={"/app/dividas/nova" as Route}
          className="focus-ring inline-flex items-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)] backdrop-blur transition-colors hover:bg-[color:var(--surface-1)]"
        >
          Cadastrar dívida
        </Link>
        <Link
          href={"/app/patrimonio/novo" as Route}
          className="focus-ring inline-flex items-center rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-2.5 text-[0.8125rem] font-bold text-[color:var(--text-primary)] backdrop-blur transition-colors hover:bg-[color:var(--surface-1)]"
        >
          Adicionar ativo
        </Link>
      </div>
    </section>
  );
}
