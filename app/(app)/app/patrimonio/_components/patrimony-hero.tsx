import { ArrowRight, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { HowItWorksSheet } from "../../_components/how-it-works-sheet";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";

export interface PatrimonyHeroProps {
  netWorthFormatted: string;
  netWorthIsNegative: boolean;
  totalAssetsFormatted: string;
  totalDebtFormatted: string;
}

export function PatrimonyHero({
  netWorthFormatted,
  totalAssetsFormatted,
  totalDebtFormatted,
}: PatrimonyHeroProps) {
  return (
    <section className="glass-tier-1 relative overflow-hidden p-[22px]">
      <div
        className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-white/[0.12]"
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-white">
            <div className="text-[0.6875rem] font-semibold uppercase tracking-wide opacity-95">
              Patrimônio
            </div>
            <HowItWorksSheet topic="patrimonio" variant="chip" />
          </div>
          <div
            className="mt-1 text-[2.25rem] font-extrabold leading-none"
            style={{ letterSpacing: "-0.5px", textShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <HideableValue>{netWorthFormatted}</HideableValue>
          </div>
        </div>
        <Wallet size={28} strokeWidth={1.5} aria-hidden className="opacity-80" />
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3 text-sm">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">O que você tem</div>
          <div className="mt-0.5 font-bold"><HideableValue>{totalAssetsFormatted}</HideableValue></div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">
            Dívidas
          </div>
          <div className="mt-0.5 font-bold"><HideableValue>{totalDebtFormatted}</HideableValue></div>
        </div>
      </div>
      <Link
        href={"/app/simular" as Route}
        className="focus-ring relative mt-3 flex items-center justify-between rounded-xl bg-white/15 px-3 py-2.5 text-white transition-colors hover:bg-white/20"
      >
        <span className="text-[0.8125rem] font-semibold">Simular quanto isso pode render</span>
        <ArrowRight size={15} strokeWidth={2.25} aria-hidden />
      </Link>
    </section>
  );
}
