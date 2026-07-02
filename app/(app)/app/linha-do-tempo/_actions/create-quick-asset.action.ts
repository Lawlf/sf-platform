"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const inputSchema = z.object({
  label: z.string().min(1, "Informe o nome do bem.").max(120, "Máximo de 120 caracteres."),
});

export const createQuickAssetAction = action({
  schema: inputSchema,
  handler: async ({ label }, { userId, profileId }) => {
    const trimmed = label.trim();
    const created = unwrap(
      await createAsset(
        { assets: repos.assets, allocations: repos.assetDebtAllocations, debts: repos.debts, clock },
        {
          userId,
          profileId,
          category: "other",
          label: trimmed,
          currentValueCents: 0n,
          currency: "BRL",
          metadata: { kind: "other", description: trimmed },
          fipeCode: null,
          acquiredAt: null,
          allocations: [],
        },
      ),
    );
    return { asset: { id: created.id, label: created.label, category: created.category } };
  },
});
