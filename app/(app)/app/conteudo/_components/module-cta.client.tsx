"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";

import { PayoffForm } from "../../simular/quitacao/_components/payoff-form";
import { fetchPayoffDebts, type PayoffDebt } from "../_actions/payoff-debts.action";

const CTA_CLASS =
  "mt-6 inline-flex items-center justify-center rounded-full border border-[color:var(--border-soft)] px-5 py-2.5 text-[0.8125rem] font-semibold text-[color:var(--brand-ink)]";

// Rotas de simulador que abrem em drawer/modal (formulário curto). Listas
// (dívidas, patrimônio) seguem navegação normal.
const PAYOFF_ROUTE = "/app/simular/quitacao";

export function ModuleCta({ href, label }: { href: string; label: string }) {
  if (href === PAYOFF_ROUTE) {
    return <PayoffCta label={label} />;
  }
  return (
    <Link href={href as Route} className={CTA_CLASS}>
      {label}
    </Link>
  );
}

function PayoffCta({ label }: { label: string }) {
  const [debts, setDebts] = useState<PayoffDebt[] | null>(null);

  async function onOpenChange(next: boolean) {
    if (next && debts === null) {
      const d = await fetchPayoffDebts();
      setDebts(d);
    }
  }

  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button type="button" className={CTA_CLASS}>
          {label}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--brand-ink)]">
            <span
              className="block h-[1.5px] w-3.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
            />
            Simulador
          </div>
          <SheetTitle className="font-serif text-[1.25rem] leading-[1.2] tracking-[-0.015em]">
            Projeção de quitação
          </SheetTitle>
        </SheetHeader>

        {debts === null ? (
          <div className="flex justify-center py-6"><Spinner size={20} /></div>
        ) : debts.length === 0 ? (
          <p className="py-4 text-[0.8125rem] leading-[1.5] text-[color:var(--text-secondary)]">
            Cadastre uma dívida ativa para simular a quitação.
          </p>
        ) : (
          <PayoffForm debts={debts} />
        )}
      </SheetContent>
    </Sheet>
  );
}
