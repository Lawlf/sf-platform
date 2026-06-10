import type { UserCategoryEntity } from "@/domain/entities/user-category.entity";

import { type CategoryDomain, defaultCategoriesFor } from "./default-categories";

export interface ResolvedCategory {
  key: string;
  label: string;
  icon: string;
  isDefault: boolean;
  archived: boolean;
}

export function resolveCategories(
  domain: CategoryDomain,
  rows: readonly UserCategoryEntity[],
): ResolvedCategory[] {
  const domainRows = rows.filter((r) => r.domain === domain);
  const overrides = new Map(
    domainRows.filter((r) => r.kind === "override").map((r) => [r.slug, r]),
  );
  const defaults = defaultCategoriesFor(domain).map((d) => {
    const o = overrides.get(d.slug);
    return {
      key: d.slug,
      label: o?.name ?? d.label,
      icon: o?.icon ?? d.icon,
      isDefault: true,
      archived: o?.archivedAt != null,
    };
  });
  const customs = domainRows
    .filter((r) => r.kind === "custom")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((r) => ({
      key: r.id,
      label: r.name ?? "",
      icon: r.icon ?? "Tag",
      isDefault: false,
      archived: r.archivedAt != null,
    }));
  return [...defaults, ...customs];
}

export function activeCategories(
  resolved: readonly ResolvedCategory[],
): ResolvedCategory[] {
  return resolved.filter((c) => !c.archived);
}

export function categoryLabel(
  key: string | null,
  resolved: readonly ResolvedCategory[],
): string {
  if (key === null) return "Sem categoria";
  return resolved.find((c) => c.key === key)?.label ?? key;
}
