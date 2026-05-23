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

interface LinkSummaryInput {
  linkAssetChoice?: "unset" | "no" | "existing" | "new" | undefined;
  newAssetLabel?: string | null | undefined;
}

export function buildLinkSummary(values: LinkSummaryInput): string {
  if (values.linkAssetChoice === "no") return "Sem vínculo";
  if (values.linkAssetChoice === "existing") return "Vincular bem existente";
  if (values.linkAssetChoice === "new") {
    return `Cadastrar bem: ${(values.newAssetLabel ?? "").trim() || "(sem nome)"}`;
  }
  return "Sem vínculo";
}
