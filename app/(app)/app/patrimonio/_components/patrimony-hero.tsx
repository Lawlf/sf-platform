import { Wallet } from "lucide-react";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";

import { CarteiraBalanceRow } from "./carteira-balance-row.client";

export interface PatrimonyHeroProps {
  netWorthFormatted: string;
  netWorthIsNegative: boolean;
  totalAssetsFormatted: string;
  totalDebtFormatted: string;
}

export function PatrimonyHero({
  netWorthFormatted,
  netWorthIsNegative,
  totalAssetsFormatted,
  totalDebtFormatted,
}: PatrimonyHeroProps) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Patrimônio líquido
          </div>
          <div
            className={`mt-1 text-[2.25rem] font-extrabold leading-none ${
              netWorthIsNegative
                ? "text-[color:var(--semantic-negative)]"
                : "text-[color:var(--text-primary)]"
            }`}
            style={{ letterSpacing: "-0.5px" }}
          >
            <HideableValue>{netWorthFormatted}</HideableValue>
          </div>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/12 text-[color:var(--color-brand-700)]">
          <Wallet size={20} strokeWidth={2} aria-hidden />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            O que você tem
          </div>
          <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">
            <HideableValue>{totalAssetsFormatted}</HideableValue>
          </div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Dívidas
          </div>
          <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">
            <HideableValue>{totalDebtFormatted}</HideableValue>
          </div>
        </div>
      </div>

      <CarteiraBalanceRow />
    </section>
  );
}
