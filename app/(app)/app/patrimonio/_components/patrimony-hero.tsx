import { Wallet } from "lucide-react";

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
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide opacity-95">
            Patrimônio líquido
          </div>
          <div
            className="mt-1 text-[2.25rem] font-extrabold leading-none"
            style={{ letterSpacing: "-0.5px", textShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            {netWorthFormatted}
          </div>
        </div>
        <Wallet size={28} strokeWidth={1.5} aria-hidden className="opacity-80" />
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3 text-sm">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">Ativos</div>
          <div className="mt-0.5 font-bold">{totalAssetsFormatted}</div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">
            Dívidas
          </div>
          <div className="mt-0.5 font-bold">{totalDebtFormatted}</div>
        </div>
      </div>
    </section>
  );
}
