"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import type { AssetCategory, AssetMetadata } from "@/domain/entities/asset.entity";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError, unwrap } from "@/presentation/actions/action";

import { awardEventAchievement } from "../../../_actions/_achievements";

const schema = z.object({
  assetLabel: z.string().min(1).max(120),
  assetCategory: z.enum(["vehicle", "real_estate", "investment", "cash", "other"]),
  amountCents: z.coerce.bigint().positive(),
  depreciationKind: z.enum(["appreciating", "stable", "depreciating", "consumable"]),
  depreciationRatePctYear: z.coerce.number().min(-50).max(100),
  purchaseDate: z.string().min(1),
  expenseCategory: z
    .enum([
      "housing",
      "utilities",
      "food",
      "transport",
      "health",
      "leisure",
      "subscriptions",
      "education",
      "other",
    ])
    .optional(),
  paymentMethod: z.enum(["cash"]),
});

export const savePurchaseAction = action({
  schema,
  revalidates: ["assets", "debts", "home"],
  handler: async (input, { userId }) => {
    const purchaseDate = new Date(input.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) {
      throw new ActionError("Data da compra inválida.");
    }

    const asset = unwrap(
      await createAsset(
        {
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
          debts: repos.debts,
          clock,
        },
        {
          userId,
          category: input.assetCategory,
          label: input.assetLabel,
          currentValueCents: input.amountCents,
          currency: "BRL",
          metadata: assetMetadataForCategory(input.assetCategory),
          fipeCode: null,
          acquiredAt: purchaseDate,
          allocations: [],
          depreciationKind: input.depreciationKind,
          depreciationRatePctYear: input.depreciationRatePctYear,
          purchaseDate,
        },
      ),
    );

    await awardEventAchievement(userId, "mapa-do-tesouro");

    return { assetId: asset.id };
  },
});

function assetMetadataForCategory(category: AssetCategory): AssetMetadata | null {
  switch (category) {
    case "vehicle":
      return null;
    case "real_estate":
      return null;
    case "investment":
      return null;
    case "cash":
      return { kind: "cash" };
    case "other":
      return { kind: "other" };
    default:
      return null;
  }
}
