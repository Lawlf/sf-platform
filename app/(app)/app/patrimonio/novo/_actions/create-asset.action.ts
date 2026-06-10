"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import type { AssetMetadata } from "@/domain/entities/asset.entity";
import { CURRENCIES } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

import { awardEventAchievement } from "../../../_actions/_achievements";

const allocSchema = z.object({
  debtId: z.string().uuid(),
  allocationOriginalCents: z.string().regex(/^\d+$/, "Alocação inválida."),
});

const inputSchema = z.object({
  category: z.enum(["vehicle", "real_estate", "investment", "cash", "other"]),
  label: z.string().min(1).max(120),
  currentValueCents: z
    .string()
    .regex(/^-?\d+$/, "Valor inválido.")
    .refine((s) => BigInt(s) >= 0n, "Valor do ativo não pode ser negativo."),
  currency: z.enum(CURRENCIES).default("BRL"),
  metadataJson: z
    .string()
    .nullable()
    .refine((s) => {
      if (s === null || s.length === 0) return true;
      try {
        JSON.parse(s);
        return true;
      } catch {
        return false;
      }
    }, "Metadados inválidos."),
  acquiredAt: z.string().nullable(),
  allocations: z.array(allocSchema),
  depreciationKind: z
    .enum(["appreciating", "stable", "depreciating", "consumable"])
    .default("stable"),
  depreciationRatePctYear: z.coerce.number().min(-50).max(100).default(0),
  purchaseDate: z.string().optional().nullable(),
  purchasePriceCents: z
    .string()
    .regex(/^-?\d+$/, "Preço de compra inválido.")
    .refine((s) => BigInt(s) >= 0n, "Preço de compra não pode ser negativo.")
    .nullable()
    .optional(),
});

export const createAssetAction = action({
  schema: inputSchema,
  revalidates: ["assets", "debts", "timeline", "notifications", "home"],
  handler: async (data, { userId }) => {
    const metadata =
      data.metadataJson !== null && data.metadataJson.length > 0
        ? (JSON.parse(data.metadataJson) as AssetMetadata)
        : null;
    const acquiredAt = data.acquiredAt ? new Date(data.acquiredAt) : null;
    const purchaseDate =
      data.purchaseDate && data.purchaseDate.length > 0 ? new Date(data.purchaseDate) : null;

    const currentValueCents = BigInt(data.currentValueCents);

    let purchasePriceCents: bigint | null = null;
    if (data.purchasePriceCents !== undefined && data.purchasePriceCents !== null) {
      const p = BigInt(data.purchasePriceCents);
      purchasePriceCents = p > 0n ? p : null;
    }

    const allocations = data.allocations
      .map((a) => ({
        debtId: a.debtId,
        allocationOriginalCents: BigInt(a.allocationOriginalCents),
      }))
      .filter((a) => a.allocationOriginalCents > 0n);

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
          category: data.category,
          label: data.label,
          currentValueCents,
          currency: data.currency,
          metadata,
          fipeCode: null,
          acquiredAt,
          allocations,
          depreciationKind: data.depreciationKind,
          depreciationRatePctYear: data.depreciationRatePctYear,
          purchaseDate,
          purchasePriceCents,
        },
      ),
    );

    await awardEventAchievement(userId, "mapa-do-tesouro");
    return { assetId: asset.id };
  },
  revalidatePaths: (data) => [`/app/patrimonio/${data.assetId}`],
});
