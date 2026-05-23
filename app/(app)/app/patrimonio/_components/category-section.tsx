import { Box, Car, Home, TrendingUp, Wallet } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";

import type { AssetCategory } from "@/domain/entities/asset.entity";

import { AssetCard } from "./asset-card";

const CATEGORY_LABEL: Record<AssetCategory, string> = {
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
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          {CATEGORY_LABEL[category]}
        </h2>
        <span className="text-[11px] font-semibold text-[color:var(--text-secondary)]">
          {totalFormatted}
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
