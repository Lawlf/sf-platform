"use client";

import { useEffect, useState, type ReactNode } from "react";

import { fetchIncomes } from "@/app/(app)/app/_actions/income-queries";
import { Spinner } from "@/app/components/ui/spinner";

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCents(cents: bigint): string {
  return brl.format(Number(cents) / 100);
}

// Renda mensal recorrente: o onboarding sempre grava "monthly"; normalizamos weekly
// por garantia e ignoramos one_off (não é renda recorrente do mês).
export function monthlyIncomeCents(incomes: Awaited<ReturnType<typeof fetchIncomes>>): bigint {
  return incomes
    .filter((i) => i.isActive)
    .reduce((acc, i) => {
      const c = BigInt(i.amount.cents);
      if (i.frequency === "monthly") return acc + c;
      if (i.frequency === "weekly") return acc + (c * 52n) / 12n;
      return acc;
    }, 0n);
}

// null = ainda carregando. Falha de rede cai em 0n + failed pra render do gancho.
export function useMonthlyIncomeCents(): { cents: bigint | null; failed: boolean } {
  const [cents, setCents] = useState<bigint | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchIncomes()
      .then((inc) => {
        if (active) setCents(monthlyIncomeCents(inc));
      })
      .catch((e) => {
        console.error("fetchIncomes (onboarding preview) falhou", e);
        if (active) {
          setFailed(true);
          setCents(0n);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { cents, failed };
}

export function ResultPreviewLoading() {
  return (
    <div className="flex justify-center py-4">
      <Spinner size={20} decorative />
    </div>
  );
}

// Estado honesto pra quando ainda não há número (valor zerado ou baseline ausente):
// nunca mostramos R$ 0 como se fosse resultado real.
export function ResultPreviewHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <p className="text-sm text-[color:var(--text-secondary)]">{children}</p>
    </div>
  );
}

export function ResultStatCard({
  eyebrow,
  value,
  caption,
  negative = false,
}: {
  eyebrow: string;
  value: string;
  caption?: ReactNode;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {eyebrow}
      </p>
      <p
        className={`mt-1 text-[2rem] font-extrabold leading-none transition-colors ${
          negative ? "text-[color:var(--semantic-negative)]" : "text-[color:var(--text-primary)]"
        }`}
      >
        {value}
      </p>
      {caption ? <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{caption}</p> : null}
    </div>
  );
}

export function ResultHintCard({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-brand-500)] bg-[color:var(--surface-2)] p-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--color-brand-800)]">
        {eyebrow}
      </p>
      <div className="mt-1 text-sm text-[color:var(--text-primary)]">{children}</div>
    </div>
  );
}
