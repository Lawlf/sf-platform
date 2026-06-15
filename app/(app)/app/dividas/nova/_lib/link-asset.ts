import { z } from "zod";

import { type LinkAssetChoice, type NewAssetCategory } from "../_components/link-asset-step";

// Shared Zod slice used by every "new debt" form (loan, financing, cartão).
export const linkAssetSlice = {
  linkAssetChoice: z.enum(["unset", "no", "existing", "new"]),
  linkedAssetId: z.string().nullable().optional(),
  linkedAssetAllocationCents: z.bigint().nullable().optional(),
  newAssetCategory: z.enum(["vehicle", "real_estate", "other"]).optional(),
  newAssetLabel: z.string().optional(),
  newAssetCurrentValueCents: z.bigint().nullable().optional(),
  newAssetAcquiredAt: z.string().nullable().optional(),
};

export const linkAssetDefaults = {
  linkAssetChoice: "unset" as LinkAssetChoice,
  linkedAssetId: null as string | null,
  linkedAssetAllocationCents: null as bigint | null,
  newAssetCategory: undefined as NewAssetCategory | undefined,
  newAssetLabel: "",
  newAssetCurrentValueCents: null as bigint | null,
  newAssetAcquiredAt: null as string | null,
};

export function linkAssetDefaultsFor(initialLinkAssetId?: string | null) {
  if (!initialLinkAssetId) return linkAssetDefaults;
  return {
    ...linkAssetDefaults,
    linkAssetChoice: "existing" as LinkAssetChoice,
    linkedAssetId: initialLinkAssetId,
  };
}

export function debtCreatedHref(
  initialLinkAssetId: string | null | undefined,
  debtId: string,
): string {
  return initialLinkAssetId ? `/app/patrimonio/${initialLinkAssetId}` : `/app/dividas/${debtId}`;
}

interface LinkSummaryInput {
  linkAssetChoice?: "unset" | "no" | "existing" | "new" | undefined;
  newAssetLabel?: string | null | undefined;
}

export function buildLinkSummary(values: LinkSummaryInput): string {
  if (values.linkAssetChoice === "existing") return "Liga a um bem que você já tem";
  if (values.linkAssetChoice === "new") {
    const name = (values.newAssetLabel ?? "").trim();
    return name ? `Vou criar "${name}" no seu patrimônio` : "Vou criar um bem novo no seu patrimônio";
  }
  return "Sem vínculo";
}
