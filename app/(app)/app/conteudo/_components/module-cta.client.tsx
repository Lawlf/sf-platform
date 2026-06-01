"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [open, setOpen] = useState(false);
  const [debts, setDebts] = useState<PayoffDebt[] | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function openDrawer() {
    setOpen(true);
    if (debts === null) {
      const d = await fetchPayoffDebts();
      setDebts(d);
    }
  }

  const sheet = (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Projeção de quitação"
        className="absolute inset-x-0 bottom-0 z-[120] max-h-[85vh] overflow-y-auto rounded-t-[24px] border-t border-[color:var(--border-soft)] bg-[color:var(--bg-app)] p-5 md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[440px] md:max-w-[calc(100vw-32px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px] md:border"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--brand-ink)]">
              <span
                className="block h-[1.5px] w-3.5 rounded-full"
                style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
              />
              Simulador
            </div>
            <h2 className="mt-1 font-serif text-[1.25rem] font-bold leading-[1.2] tracking-[-0.015em] text-[color:var(--text-primary)]">
              Projeção de quitação
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[color:var(--text-secondary)]"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {debts === null ? (
          <div className="flex justify-center py-6"><Spinner size={20} /></div>
        ) : debts.length === 0 ? (
          <p className="py-4 text-[0.8125rem] leading-[1.5] text-[color:var(--text-secondary)]">
            Cadastre uma dívida ativa para simular a quitação.
          </p>
        ) : (
          <PayoffForm debts={debts} />
        )}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={openDrawer} className={CTA_CLASS}>
        {label}
      </button>
      {mounted && open ? createPortal(sheet, document.body) : null}
    </>
  );
}
