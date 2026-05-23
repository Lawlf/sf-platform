import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export interface AssetCardProps {
  href: Route;
  label: string;
  valueFormatted: string;
  netWorthFormatted: string;
  netWorthIsNegative: boolean;
  icon: ReactNode;
}

export function AssetCard({
  href,
  label,
  valueFormatted,
  netWorthFormatted,
  netWorthIsNegative,
  icon,
}: AssetCardProps) {
  const nwColor = netWorthIsNegative
    ? "text-[color:var(--semantic-negative)]"
    : "text-[color:var(--semantic-positive)]";
  return (
    <Link
      href={href}
      className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-1)]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-bold text-[color:var(--text-primary)]">{label}</div>
        <div className="mt-0.5 flex items-baseline gap-2 text-[0.6875rem]">
          <span className="text-[color:var(--text-muted)]">Valor</span>
          <span className="font-semibold text-[color:var(--text-primary)]">{valueFormatted}</span>
          <span className="text-[color:var(--text-muted)]">·</span>
          <span className="text-[color:var(--text-muted)]">Líquido</span>
          <span className={`font-semibold ${nwColor}`}>{netWorthFormatted}</span>
        </div>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={2}
        className="text-[color:var(--color-brand-800)]"
        aria-hidden
      />
    </Link>
  );
}
