import { Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function PatrimonyEmptyState() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Wallet size={28} strokeWidth={1.5} aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-bold text-[color:var(--text-primary)]">
          Comece cadastrando um ativo
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Carro, imóvel, investimento ou qualquer bem com valor. Vincule a uma dívida correspondente
          e veja seu patrimônio real.
        </p>
      </div>
      <Link
        href={"/app/patrimonio/novo" as Route}
        className="focus-ring inline-flex items-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-sm font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition hover:brightness-105"
      >
        Adicionar ao patrimônio
      </Link>
    </section>
  );
}
