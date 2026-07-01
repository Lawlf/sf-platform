"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import type { AssetCategory } from "@/domain/entities/asset.entity";

import { fetchAssetsWithAllocations, fetchNetWorth } from "../../_actions/asset-queries";
import { queryKeys } from "../../_lib/query-keys";

import { CATEGORY_LABEL, CategorySection, type CategoryAssetItem } from "./category-section";
import { PatrimonyEmptyState } from "./empty-state";
import { PatrimonyHero } from "./patrimony-hero";
import { InvestmentEvolutionCard } from "./investment-evolution-card.client";

const ALL_CATEGORIES: AssetCategory[] = ["vehicle", "real_estate", "investment", "cash", "other"];

type CategoryFilter = AssetCategory | "all";

const FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "Todas as categorias" },
  ...ALL_CATEGORIES.map((cat) => ({ id: cat, label: CATEGORY_LABEL[cat] })),
];

export function PatrimonioContentClient() {
  const { data: snapshot } = useSuspenseQuery({
    queryKey: queryKeys.netWorth,
    queryFn: () => fetchNetWorth(),
  });
  const { data: assets } = useSuspenseQuery({
    queryKey: queryKeys.assetsWithAllocations,
    queryFn: () => fetchAssetsWithAllocations(),
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (term && !a.label.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [assets, search, categoryFilter]);

  if (!snapshot) {
    return <p className="text-sm opacity-70">Não foi possível carregar o patrimônio.</p>;
  }

  if (snapshot.totalAssetCount === 0) {
    return <PatrimonyEmptyState />;
  }

  const itemsByCategory = new Map<AssetCategory, CategoryAssetItem[]>();
  for (const cat of ALL_CATEGORIES) itemsByCategory.set(cat, []);

  for (const a of filteredAssets) {
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

  const currentFilterLabel = FILTERS.find((f) => f.id === categoryFilter)?.label ?? "Todas";
  const isFiltered = search.trim() !== "" || categoryFilter !== "all";

  return (
    <>
      <PatrimonyHero
        netWorthFormatted={snapshot.netWorth.formatted}
        netWorthIsNegative={snapshot.netWorthIsNegative}
        totalAssetsFormatted={snapshot.totalAssets.formatted}
        totalDebtFormatted={snapshot.totalDebtBalance.formatted}
      />

      <InvestmentEvolutionCard />

      {assets.length > 1 ? (
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2">
            <Search
              size={16}
              strokeWidth={2}
              className="shrink-0 text-[color:var(--text-muted)]"
              aria-hidden
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar bem"
              className="w-full bg-transparent text-[0.8125rem] text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
            />
          </label>

          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              className="focus-ring flex shrink-0 items-center gap-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.8125rem] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-1)]"
            >
              {currentFilterLabel}
              <ChevronDown size={14} strokeWidth={2} aria-hidden />
            </button>
            <SheetContent side="bottom" className="p-0">
              <SheetHeader className="p-4">
                <SheetTitle>Filtrar por categoria</SheetTitle>
              </SheetHeader>
              <div className="divide-y divide-[color:var(--border-soft)] border-t border-[color:var(--border-soft)]">
                {FILTERS.map((f) => {
                  const active = categoryFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(f.id);
                        setFilterSheetOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
                    >
                      <span className="flex-1 text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                        {f.label}
                      </span>
                      {active ? (
                        <Check
                          size={18}
                          strokeWidth={2.5}
                          className="text-[color:var(--color-brand-700)]"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : null}

      {isFiltered && filteredAssets.length === 0 ? (
        <p className="px-1 text-[0.8125rem] text-[color:var(--text-secondary)]">Nada encontrado.</p>
      ) : (
        ALL_CATEGORIES.map((cat) => {
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
        })
      )}
    </>
  );
}
