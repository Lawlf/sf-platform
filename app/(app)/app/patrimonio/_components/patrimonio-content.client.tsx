"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";

import type { AssetCategory } from "@/domain/entities/asset.entity";

import { fetchAssetsWithAllocations, fetchNetWorth } from "../../_actions/asset-queries";
import { queryKeys } from "../../_lib/query-keys";

import { CarteiraBalanceCard } from "./carteira-balance-card.client";
import { CategorySection, type CategoryAssetItem } from "./category-section";
import { InvestmentEvolutionCard } from "./investment-evolution-card.client";
import { PatrimonyEmptyState } from "./empty-state";
import { PatrimonyHero } from "./patrimony-hero";

const ALL_CATEGORIES: AssetCategory[] = ["vehicle", "real_estate", "investment", "cash", "other"];

export function PatrimonioContentClient() {
  const { data: snapshot } = useSuspenseQuery({
    queryKey: queryKeys.netWorth,
    queryFn: () => fetchNetWorth(),
  });
  const { data: assets } = useSuspenseQuery({
    queryKey: queryKeys.assetsWithAllocations,
    queryFn: () => fetchAssetsWithAllocations(),
  });

  if (!snapshot) {
    return <p className="text-sm opacity-70">Não foi possível carregar o patrimônio.</p>;
  }

  if (snapshot.totalAssetCount === 0) {
    return <PatrimonyEmptyState />;
  }

  const itemsByCategory = new Map<AssetCategory, CategoryAssetItem[]>();
  for (const cat of ALL_CATEGORIES) itemsByCategory.set(cat, []);

  for (const a of assets) {
    itemsByCategory.get(a.category)?.push({
      id: a.id,
      label: a.label,
      valueFormatted: a.valueFormatted,
      netWorthFormatted: a.netWorthFormatted,
      netWorthIsNegative: a.netWorthIsNegative,
    });
  }

  const categoryTotalByKey = new Map<AssetCategory, string>();
  for (const c of snapshot.byCategory) categoryTotalByKey.set(c.category, c.totalValue.formatted);

  return (
    <>
      <PatrimonyHero
        netWorthFormatted={snapshot.netWorth.formatted}
        netWorthIsNegative={snapshot.netWorthIsNegative}
        totalAssetsFormatted={snapshot.totalAssets.formatted}
        totalDebtFormatted={snapshot.totalDebtBalance.formatted}
      />

      <CarteiraBalanceCard />
      <InvestmentEvolutionCard />

      <Link
        href={"/app/patrimonio/novo" as Route}
        className="focus-ring inline-flex items-center justify-center self-start rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition hover:brightness-105"
      >
        Adicionar ao patrimônio
      </Link>

      {ALL_CATEGORIES.map((cat) => {
        const items = itemsByCategory.get(cat) ?? [];
        if (items.length === 0) return null;
        return (
          <CategorySection
            key={cat}
            category={cat}
            totalFormatted={categoryTotalByKey.get(cat) ?? ""}
            items={items}
          />
        );
      })}
    </>
  );
}
