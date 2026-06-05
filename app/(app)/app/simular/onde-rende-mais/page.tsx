import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { SimHowItWorks } from "../_components/sim-how-it-works";
import { loadSimPrefill } from "../_lib/sim-prefill";

import { SavingsComparisonClient } from "./_components/savings-comparison.client";

export const metadata: Metadata = { title: "Onde rende mais" };

export default async function OndeRendeMaisPage() {
  const user = await requireUser();
  const prefill = await loadSimPrefill(user.id);

  return (
    <PageShell
      title="Onde rende mais?"
      description="Poupança, CDB ou Tesouro Selic: qual rende mais, já líquido de imposto?"
      backHref="/app/simular"
    >
      <SimHowItWorks
        topic="onde-rende-mais"
        summary="A gente projeta o rendimento líquido (depois do Imposto de Renda) de cada aplicação e mostra lado a lado quem ganha."
      />
      <SavingsComparisonClient prefill={{ amountCents: prefill.cashReserveCents }} />
      <Link
        href={"/app/investir" as Route}
        className="focus-ring mt-1 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="text-[0.8125rem] font-medium text-[color:var(--text-primary)]">
          Entenda as opções: onde investir
        </span>
        <ArrowRight
          size={18}
          strokeWidth={2.25}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </Link>
    </PageShell>
  );
}
