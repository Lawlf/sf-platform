import { Box, Car, Home, TrendingUp, Wallet } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import type { AssetCategory } from "@/domain/entities/asset.entity";

import { AssetCard } from "./asset-card";

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  vehicle: "Veículos",
  real_estate: "Imóveis",
  investment: "Investimentos",
  cash: "Reserva",
  other: "Outros",
};

function iconFor(category: AssetCategory): ReactNode {
  switch (category) {
    case "vehicle":
      return <Car size={18} strokeWidth={1.75} aria-hidden />;
    case "real_estate":
      return <Home size={18} strokeWidth={1.75} aria-hidden />;
    case "investment":
      return <TrendingUp size={18} strokeWidth={1.75} aria-hidden />;
    case "cash":
      return <Wallet size={18} strokeWidth={1.75} aria-hidden />;
    case "other":
      return <Box size={18} strokeWidth={1.75} aria-hidden />;
  }
}

export interface CategoryAssetItem {
  id: string;
  label: string;
  valueFormatted: string;
  netWorthFormatted: string;
  netWorthIsNegative: boolean;
}

export interface CategorySectionProps {
  category: AssetCategory;
  totalFormatted: string;
  items: CategoryAssetItem[];
}

export function CategorySection({ category, totalFormatted, items }: CategorySectionProps) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          {CATEGORY_LABEL[category]}
        </h2>
        <span className="text-[0.6875rem] font-semibold text-[color:var(--text-secondary)]">
          <HideableValue>{totalFormatted}</HideableValue>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <AssetCard
            key={item.id}
            href={`/app/patrimonio/${item.id}` as Route}
            label={item.label}
            valueFormatted={item.valueFormatted}
            netWorthFormatted={item.netWorthFormatted}
            netWorthIsNegative={item.netWorthIsNegative}
            icon={iconFor(category)}
          />
        ))}
      </div>
    </section>
  );
}
