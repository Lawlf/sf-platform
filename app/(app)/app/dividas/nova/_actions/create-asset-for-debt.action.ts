"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import type { AssetMetadata } from "@/domain/entities/asset.entity";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  category: z.enum(["vehicle", "real_estate", "other"]),
  label: z.string().min(1, "Informe o nome do bem.").max(120, "Máximo de 120 caracteres."),
  currentValueCents: z.string().regex(/^\d+$/, "Valor inválido."),
  acquiredAt: z.string().nullable().optional(),
});

export type CreateAssetForDebtInput = z.input<typeof inputSchema>;

export const createAssetForDebtAction = action({
  schema: inputSchema,
  handler: async (v, { userId, profileId }) => {
    const currentValueCents = BigInt(v.currentValueCents);

    const acquiredAt = v.acquiredAt && v.acquiredAt.length > 0 ? new Date(v.acquiredAt) : null;
    if (acquiredAt && Number.isNaN(acquiredAt.getTime())) {
      throw new ActionError("Data inválida.");
    }

    let metadata: AssetMetadata | null = null;
    if (v.category === "vehicle") {
      metadata = {
        kind: "vehicle",
        brand: "-",
        model: v.label.trim(),
        year: new Date().getFullYear(),
      };
    } else if (v.category === "real_estate") {
      metadata = { kind: "real_estate", addressCity: "-" };
    } else {
      metadata = { kind: "other", description: v.label.trim() };
    }

    const depreciationKind: "appreciating" | "stable" | "depreciating" =
      v.category === "real_estate"
        ? "appreciating"
        : v.category === "vehicle"
          ? "depreciating"
          : "stable";
    const depreciationRatePctYear =
      v.category === "vehicle" ? 15 : v.category === "real_estate" ? -3 : 0;

    const created = unwrap(
      await createAsset(
        {
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
          debts: repos.debts,
          clock,
        },
        {
          userId,
          profileId,
          category: v.category,
          label: v.label.trim(),
          currentValueCents,
          currency: "BRL",
          metadata,
          fipeCode: null,
          acquiredAt,
          allocations: [],
          depreciationKind,
          depreciationRatePctYear,
          purchaseDate: acquiredAt,
          purchasePriceCents: currentValueCents > 0n ? currentValueCents : null,
        },
      ),
    );

    return { assetId: created.id };
  },
});
